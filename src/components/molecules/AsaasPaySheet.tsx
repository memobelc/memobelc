import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import {
  copyText,
  formatCpfCnpj,
  openAsaasCheckout,
  startCheckout,
  waitForPayment,
  type BillingType,
  type CreditCardPayload,
} from '@/services/checkout';
import { CheckoutField } from '@/components/atoms/CheckoutField';

type PixInfo = {
  encoded_image?: string;
  payload?: string;
  expiration_date?: string;
};

type AsaasPaySheetProps = {
  visible: boolean;
  onClose: () => void;
  token?: string;
  productType?: 'plan' | 'book' | 'bundle' | 'course' | 'classroom';
  productId?: string;
  title?: string;
  header?: ReactNode;
  mode?: 'checkout' | 'update-card';
  publicCheckout?: {
    name: string;
    email: string;
    password?: string;
  };
  initialCpf?: string;
  initialCoupon?: string;
  hideCpfAndCoupon?: boolean;
  initialPhone?: string;
  onAuthPayload?: (result: any) => void | Promise<void>;
  onSuccess: (result?: any) => void | Promise<void>;
};

const emptyCard = {
  holder_name: '',
  number: '',
  expiry: '',
  ccv: '',
  postal_code: '',
  address_number: '',
  phone: '',
};

function parseExpiry(value: string) {
  const digits = value.replace(/\D/g, '');
  return {
    expiry_month: digits.slice(0, 2),
    expiry_year: digits.slice(2, 6),
  };
}

function toCreditCard(card: typeof emptyCard): CreditCardPayload {
  const { expiry_month, expiry_year } = parseExpiry(card.expiry);
  return {
    holder_name: card.holder_name.trim(),
    number: card.number.replace(/\D/g, ''),
    expiry_month,
    expiry_year,
    ccv: card.ccv.replace(/\D/g, ''),
    postal_code: card.postal_code.replace(/\D/g, ''),
    address_number: card.address_number.trim(),
    phone: card.phone.replace(/\D/g, ''),
  };
}

export default function AsaasPaySheet({
  visible,
  onClose,
  token,
  productType = 'plan',
  productId,
  title,
  header,
  mode = 'checkout',
  publicCheckout,
  initialCpf = '',
  initialCoupon = '',
  hideCpfAndCoupon = false,
  initialPhone = '',
  onAuthPayload,
  onSuccess,
}: AsaasPaySheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateCard = mode === 'update-card';
  const [coupon, setCoupon] = useState(initialCoupon);
  const [cpfCnpj, setCpfCnpj] = useState(initialCpf);
  const [showCoupon, setShowCoupon] = useState(!!initialCoupon);
  const [method, setMethod] = useState<BillingType>(updateCard ? 'CREDIT_CARD' : 'PIX');
  const [card, setCard] = useState(emptyCard);
  const [buying, setBuying] = useState(false);
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState(token);

  const reset = () => {
    setCoupon(initialCoupon);
    setCpfCnpj(initialCpf);
    setShowCoupon(!!initialCoupon);
    setMethod(updateCard ? 'CREDIT_CARD' : 'PIX');
    setCard({ ...emptyCard, phone: initialPhone });
    setBuying(false);
    setPix(null);
    setHostedUrl(null);
    setPaymentId(null);
    setAuthToken(token);
  };

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (visible) {
      setCoupon(initialCoupon);
      setCpfCnpj(initialCpf);
      setShowCoupon(!!initialCoupon);
      setCard((prev) => ({ ...prev, phone: initialPhone || prev.phone }));
      return;
    }
    reset();
  }, [visible, updateCard, initialCpf, initialCoupon, initialPhone]);

  const close = () => {
    reset();
    onClose();
  };

  const finishSuccess = async (result?: any) => {
    await onSuccess(result);
    close();
  };

  const pollUntilPaid = async (id: string, pollToken?: string) => {
    try {
      const granted = await waitForPayment(pollToken || authToken, id);
      if (granted) {
        await finishSuccess({ granted: true, payment: { _id: id } });
      }
    } catch {
      /* user can tap I already paid */
    }
  };

  const pay = async () => {
    if (!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/)) {
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    if (updateCard) {
      const payload = toCreditCard(card);
      if (
        payload.number.length < 13 ||
        payload.expiry_month.length !== 2 ||
        payload.expiry_year.length < 2 ||
        payload.ccv.length < 3 ||
        payload.postal_code.length < 8 ||
        !payload.holder_name ||
        !payload.address_number ||
        payload.phone.length < 10
      ) {
        toast({ message: t('Enter complete card details'), variant: 'destructive' });
        return;
      }
    }
    try {
      setBuying(true);
      if (updateCard) {
      const response = await billingApi.updatePayment(token || authToken, {
          cpf_cnpj: cpfCnpj,
          credit_card: toCreditCard(card),
        });
        toast({ message: t('Payment method updated'), variant: 'success' });
        await finishSuccess(response.data);
        return;
      }
      if (!productId) return;
      const result = await startCheckout({
        token: authToken,
        productType,
        productId,
        couponCode: coupon || undefined,
        cpfCnpj,
        billingType: method,
        publicCheckout,
      });
      if (result?.token) {
        setAuthToken(result.token);
        if (onAuthPayload) await onAuthPayload(result);
      }
      if (result?.granted || result?.provider === 'free') {
        await finishSuccess(result);
        return;
      }
      if (method === 'PIX') {
        const id = result?.payment?._id;
        let pixData = result?.pix;
        const sessionToken = result?.token || authToken;
        if (!pixData && id) {
          try {
            const pixRes = await billingApi.pixQr(sessionToken, id);
            pixData = pixRes.data?.pix;
          } catch {
            pixData = null;
          }
        }
        if (pixData) setPix(pixData);
        if (id) {
          setPaymentId(id);
          pollUntilPaid(id, sessionToken);
        }
        if (pixData || id) return;
        toast({ message: t('Error starting checkout'), variant: 'destructive' });
        return;
      }
      const hosted =
        result?.checkout_url ||
        result?.payment?.invoice_url ||
        result?.subscription?.invoice_url;
      if (method === 'CREDIT_CARD' && hosted) {
        const id = result?.payment?._id;
        setHostedUrl(hosted);
        if (id) {
          setPaymentId(id);
          pollUntilPaid(id, result?.token || authToken);
        }
        await openAsaasCheckout(hosted);
        return;
      }
      toast({ message: t('Error starting checkout'), variant: 'destructive' });
    } catch (error: any) {
      const apiError = error.response?.data?.error || error.message || t('Error starting checkout');
      const looksLikePlay =
        error.response?.data?.code === 'missing_sku' ||
        String(apiError).toLowerCase().includes('google play');
      toast({
        message: looksLikePlay ? t('Pay with PIX or credit card') : apiError,
        variant: 'destructive',
      });
    } finally {
      setBuying(false);
    }
  };

  const checkPayment = async () => {
    if (!paymentId) return;
    try {
      setBuying(true);
      const response = await billingApi.syncPayment(authToken, paymentId);
      if (response.data?.granted || response.data?.payment?.status === 'confirmed') {
        await finishSuccess(response.data);
      } else {
        toast({ message: t('Payment still pending'), variant: 'destructive' });
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error starting checkout'),
        variant: 'destructive',
      });
    } finally {
      setBuying(false);
    }
  };

  const refreshPix = async () => {
    if (!paymentId) return;
    try {
      setBuying(true);
      const response = await billingApi.pixQr(authToken, paymentId);
      if (response.data?.pix) setPix(response.data.pix);
    } finally {
      setBuying(false);
    }
  };

  const cpfValid = !!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/);
  const showPix = !!pix && method === 'PIX' && !updateCard;
  const showHosted = !!hostedUrl && method === 'CREDIT_CARD' && !updateCard;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-center items-center bg-black/75 px-4">
          <View className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90%] p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold" style={{ color: colors.primary[600] }}>
                {title || (updateCard ? t('Update payment') : t('Pay with Asaas'))}
              </Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {header}
              {showPix ? (
                <View className="items-center">
                  <Text className="mb-3 text-center" style={{ color: colors.gray[600] }}>
                    {t('Pay with PIX using the QR code or copy the code')}
                  </Text>
                  {pix?.encoded_image ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${pix.encoded_image}` }}
                      style={{ width: 220, height: 220, marginBottom: 12 }}
                    />
                  ) : null}
                  {pix?.payload ? (
                    <Text selectable className="text-xs mb-3 text-center" style={{ color: colors.gray[700] }}>
                      {pix.payload}
                    </Text>
                  ) : null}
                  {pix?.expiration_date ? (
                    <Text className="mb-3 text-xs" style={{ color: colors.gray[500] }}>
                      {t('Expires at')}: {pix.expiration_date}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    onPress={async () => {
                      if (!pix?.payload) return;
                      const copied = await copyText(pix.payload);
                      toast({
                        message: copied ? t('Copy PIX code') : t('Error starting checkout'),
                        variant: copied ? 'success' : 'destructive',
                      });
                    }}
                    className="px-3 py-2 rounded-lg mb-2 w-full items-center"
                    style={{ backgroundColor: colors.gray[200] }}
                  >
                    <Text>{t('Copy PIX code')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={buying}
                    onPress={refreshPix}
                    className="px-3 py-2 rounded-lg mb-2 w-full items-center"
                    style={{ backgroundColor: colors.gray[200] }}
                  >
                    <Text>{t('Refresh QR code')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={buying}
                    onPress={checkPayment}
                    className="px-3 py-3 rounded-lg w-full items-center"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    {buying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold">{t('I already paid')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : showHosted ? (
                <View className="items-center">
                  <Ionicons name="card-outline" size={40} color={colors.primary[500]} />
                  <Text className="mt-3 mb-4 text-center" style={{ color: colors.gray[600] }}>
                    {t('Complete the payment on Asaas')}
                  </Text>
                  <TouchableOpacity
                    disabled={buying}
                    onPress={() => hostedUrl && openAsaasCheckout(hostedUrl)}
                    className="px-3 py-3 rounded-lg mb-2 w-full items-center"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    <Text className="text-white font-semibold">{t('Open Asaas checkout')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={buying}
                    onPress={checkPayment}
                    className="px-3 py-3 rounded-lg w-full items-center"
                    style={{ backgroundColor: colors.gray[200] }}
                  >
                    {buying ? (
                      <ActivityIndicator color={colors.primary[500]} />
                    ) : (
                      <Text className="font-semibold">{t('I already paid')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {!hideCpfAndCoupon ? (
                    !updateCard ? (
                    <View className="mb-4">
                      <Text className="text-base font-bold mb-3" style={{ color: colors.gray[800] }}>
                        {t('CPF and coupon')}
                      </Text>
                      <CheckoutField
                        label={t('CPF or CNPJ')}
                        icon="document-text-outline"
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChangeText={(value) => setCpfCnpj(formatCpfCnpj(value))}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        onPress={() => setShowCoupon((prev) => !prev)}
                        className="flex-row items-center rounded-xl px-3 py-3 mb-2"
                        style={{
                          borderWidth: 1,
                          borderColor: colors.gray[300],
                          backgroundColor: '#fff',
                        }}
                      >
                        <Ionicons name="pricetag-outline" size={20} color={colors.primary[500]} />
                        <Text className="flex-1 ml-2" style={{ color: colors.gray[700] }}>
                          {t('Have a discount coupon?')}
                        </Text>
                        <Ionicons
                          name={showCoupon ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.gray[500]}
                        />
                      </TouchableOpacity>
                      {showCoupon ? (
                        <CheckoutField
                          icon="pricetag-outline"
                          placeholder={t('Coupon code')}
                          value={coupon}
                          onChangeText={setCoupon}
                          autoCapitalize="characters"
                        />
                      ) : null}
                    </View>
                    ) : (
                    <CheckoutField
                      label={t('CPF or CNPJ')}
                      icon="document-text-outline"
                      placeholder="000.000.000-00"
                      value={cpfCnpj}
                      onChangeText={(value) => setCpfCnpj(formatCpfCnpj(value))}
                      keyboardType="numeric"
                    />
                    )
                  ) : null}
                  {!updateCard ? (
                    <View className="mb-3">
                      <Text className="text-base font-bold mb-3" style={{ color: colors.gray[800] }}>
                        {t('Choose payment method')}
                      </Text>
                      <View className="flex-row mb-1">
                        {(['PIX', 'CREDIT_CARD'] as BillingType[]).map((item) => (
                          <TouchableOpacity
                            key={item}
                            onPress={() => setMethod(item)}
                            className="flex-1 flex-row px-3 py-3 rounded-xl mr-2 items-center justify-center"
                            style={{
                              backgroundColor: method === item ? colors.primary[50] : '#fff',
                              borderWidth: 1,
                              borderColor: method === item ? colors.primary[500] : colors.gray[300],
                            }}
                          >
                            <Ionicons
                              name={item === 'PIX' ? 'qr-code-outline' : 'card-outline'}
                              size={18}
                              color={method === item ? colors.primary[500] : colors.gray[600]}
                            />
                            <Text
                              className="ml-2 font-semibold"
                              style={{ color: method === item ? colors.primary[600] : colors.gray[700] }}
                            >
                              {item === 'PIX' ? t('PIX') : t('Credit card')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {method === 'CREDIT_CARD' ? (
                        <Text className="text-xs mt-2" style={{ color: colors.gray[500] }}>
                          {t('Card payments open the Asaas website')}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {updateCard ? (
                    <>
                      <CheckoutField
                        label={t('Card holder name')}
                        icon="person-outline"
                        placeholder={t('Card holder name')}
                        value={card.holder_name}
                        onChangeText={(holder_name) => setCard((prev) => ({ ...prev, holder_name }))}
                      />
                      <CheckoutField
                        label={t('Card number')}
                        icon="card-outline"
                        placeholder={t('Card number')}
                        value={card.number}
                        onChangeText={(number) => setCard((prev) => ({ ...prev, number }))}
                        keyboardType="numeric"
                      />
                      <View className="flex-row">
                        <View className="flex-1 mr-2">
                          <CheckoutField
                            label={t('MM/YY')}
                            icon="calendar-outline"
                            placeholder={t('MM/YY')}
                            value={card.expiry}
                            onChangeText={(expiry) => setCard((prev) => ({ ...prev, expiry }))}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1">
                          <CheckoutField
                            label={t('CVV')}
                            icon="lock-closed-outline"
                            placeholder={t('CVV')}
                            value={card.ccv}
                            onChangeText={(ccv) => setCard((prev) => ({ ...prev, ccv }))}
                            keyboardType="numeric"
                            secureTextEntry
                          />
                        </View>
                      </View>
                      <CheckoutField
                        label={t('Postal code')}
                        icon="location-outline"
                        placeholder={t('Postal code')}
                        value={card.postal_code}
                        onChangeText={(postal_code) => setCard((prev) => ({ ...prev, postal_code }))}
                        keyboardType="numeric"
                      />
                      <CheckoutField
                        label={t('Address number')}
                        icon="home-outline"
                        placeholder={t('Address number')}
                        value={card.address_number}
                        onChangeText={(address_number) => setCard((prev) => ({ ...prev, address_number }))}
                      />
                      <CheckoutField
                        label={t('Phone')}
                        icon="call-outline"
                        placeholder="(11) 96123-4567"
                        value={card.phone}
                        onChangeText={(phone) => setCard((prev) => ({ ...prev, phone }))}
                        keyboardType="phone-pad"
                      />
                    </>
                  ) : null}
                  {!cpfValid ? (
                    <Text className="mb-2 text-xs" style={{ color: colors.gray[500] }}>
                      {t('Enter a valid CPF or CNPJ')}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    disabled={buying || !cpfValid || (mode === 'checkout' && !productId)}
                    onPress={pay}
                    className="px-3 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    {buying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold">
                        {updateCard
                          ? t('Save card')
                          : method === 'PIX'
                            ? t('Generate PIX')
                            : t('Pay on Asaas website')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
