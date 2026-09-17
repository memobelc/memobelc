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
import { useSession } from '@/contexts/AuthContext';
import { billingApi } from '@/services/billing';
import {
  copyText,
  formatCpfCnpj,
  openAsaasCheckout,
  startCheckout,
  waitForPayment,
  type BillingType,
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
  };
  initialCpf?: string;
  initialCoupon?: string;
  hideCpfAndCoupon?: boolean;
  initialPhone?: string;
  onAuthPayload?: (result: any) => void | Promise<void>;
  onSuccess: (result?: any) => void | Promise<void>;
};

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
  const { userInfo, updateUserInfo } = useSession();
  const resolvedCpf = formatCpfCnpj(initialCpf || userInfo?.cpf_cnpj || '');
  const updateCard = mode === 'update-card';
  const [coupon, setCoupon] = useState(initialCoupon);
  const [cpfCnpj, setCpfCnpj] = useState(resolvedCpf);
  const [showCoupon, setShowCoupon] = useState(!!initialCoupon);
  const [method, setMethod] = useState<BillingType>('PIX');
  const [buying, setBuying] = useState(false);
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState(token);

  const reset = () => {
    setCoupon(initialCoupon);
    setCpfCnpj(resolvedCpf);
    setShowCoupon(!!initialCoupon);
    setMethod('PIX');
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
      setCpfCnpj(resolvedCpf);
      setShowCoupon(!!initialCoupon);
      return;
    }
    reset();
  }, [visible, updateCard, resolvedCpf, initialCoupon, initialPhone]);

  const close = () => {
    reset();
    onClose();
  };

  const finishSuccess = async (result?: any) => {
    if (!userInfo?.cpf_cnpj && cpfCnpj) {
      const digits = cpfCnpj.replace(/\D/g, '');
      if (digits.match(/^(\d{11}|\d{14})$/)) {
        updateUserInfo({ cpf_cnpj: digits });
      }
    }
    await onSuccess(result);
    close();
  };

  const pollUntilPaid = async (id: string, pollToken?: string) => {
    try {
      const guest = publicCheckout?.email
        ? { email: publicCheckout.email, cpfCnpj }
        : undefined;
      const granted = await waitForPayment(pollToken || authToken, id, 12, guest);
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
    try {
      setBuying(true);
      let result: any;
      if (updateCard) {
        const response = await billingApi.updatePayment(token || authToken, {
          cpf_cnpj: cpfCnpj,
          billing_type: method,
        });
        result = response.data;
        if (result?.provider === 'google_play' && result?.manage_url) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.open(result.manage_url, '_blank');
          }
          toast({ message: t('Payment method updated'), variant: 'success' });
          await finishSuccess(result);
          return;
        }
      } else {
        if (!productId) return;
        result = await startCheckout({
          token: publicCheckout ? undefined : authToken,
          productType,
          productId,
          couponCode: coupon || undefined,
          cpfCnpj,
          billingType: method,
          publicCheckout,
        });
        if (result?.token) {
          setAuthToken(result.token);
          if (onAuthPayload && !publicCheckout) await onAuthPayload(result);
        }
      }
      if (result?.granted || result?.provider === 'free') {
        if (updateCard) {
          toast({ message: t('Payment method updated'), variant: 'success' });
        }
        await finishSuccess(result);
        return;
      }
      if (method === 'PIX') {
        const id = result?.payment?._id;
        let pixData = result?.pix;
        const sessionToken = result?.token || authToken;
        if (!pixData && id) {
          try {
            const pixRes = publicCheckout?.email
              ? await billingApi.publicPixQr(id, {
                  email: publicCheckout.email,
                  cpf_cnpj: cpfCnpj,
                })
              : await billingApi.pixQr(sessionToken, id);
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
      const response = publicCheckout?.email
        ? await billingApi.publicSyncPayment(paymentId, {
            email: publicCheckout.email,
            cpf_cnpj: cpfCnpj,
          })
        : await billingApi.syncPayment(authToken, paymentId);
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
      const response = publicCheckout?.email
        ? await billingApi.publicPixQr(paymentId, {
            email: publicCheckout.email,
            cpf_cnpj: cpfCnpj,
          })
        : await billingApi.pixQr(authToken, paymentId);
      if (response.data?.pix) setPix(response.data.pix);
    } finally {
      setBuying(false);
    }
  };

  const cpfValid = !!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/);
  const showPix = !!pix && method === 'PIX';
  const showHosted = !!hostedUrl && method === 'CREDIT_CARD';

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
                        {method === 'PIX' ? t('Generate PIX') : t('Pay on Asaas website')}
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
