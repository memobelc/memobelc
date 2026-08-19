import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { startCheckout } from '@/services/checkout';
import { useEntitlements } from '@/contexts/EntitlementContext';

export type CheckoutBook = {
  _id: string;
  titulo: string;
  autor?: string;
  idioma?: string;
  nivel?: string;
  genero?: string;
  price?: number;
  chapters?: { titulo?: string }[];
};

type BookCheckoutModalProps = {
  visible: boolean;
  book: CheckoutBook | null;
  onClose: () => void;
  onUnlocked: () => void;
};

async function waitForPayment(token: string | undefined, paymentId: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2000 : 3000));
    const response = await billingApi.syncPayment(token, paymentId);
    if (response.data?.granted || response.data?.payment?.status === 'confirmed') {
      return true;
    }
  }
  return false;
}

export default function BookCheckoutModal({ visible, book, onClose, onUnlocked }: BookCheckoutModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { refresh } = useEntitlements();
  const [coupon, setCoupon] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [buying, setBuying] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const resetAndClose = () => {
    setCoupon('');
    setCpfCnpj('');
    setPaymentId(null);
    setWaiting(false);
    onClose();
  };

  const confirmUnlock = async () => {
    await refresh();
    onUnlocked();
    toast({ message: t('Book unlocked'), variant: 'success' });
    resetAndClose();
  };

  const buy = async () => {
    if (!book) return;
    if (Platform.OS === 'ios') {
      toast({ message: t('Please subscribe on the website'), variant: 'destructive' });
      return;
    }
    if (!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/)) {
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    try {
      setBuying(true);
      const result = await startCheckout({
        token: userInfo?.token,
        productType: 'book',
        productId: book._id,
        couponCode: coupon || undefined,
        cpfCnpj,
      });
      const id = result?.payment?._id;
      if (result?.granted || result?.provider === 'free') {
        await confirmUnlock();
        return;
      }
      if (!id) {
        toast({ message: t('Checkout started'), variant: 'success' });
        return;
      }
      setPaymentId(id);
      setWaiting(true);
      toast({ message: t('Complete the payment to unlock the book'), variant: 'success' });
      const granted = await waitForPayment(userInfo?.token, id);
      if (granted) {
        await confirmUnlock();
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || error.message || t('Error starting checkout'),
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
      const response = await billingApi.syncPayment(userInfo?.token, paymentId);
      if (response.data?.granted || response.data?.payment?.status === 'confirmed') {
        await confirmUnlock();
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

  const chaptersCount = book?.chapters?.length || 0;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={resetAndClose}>
      <View className="flex-1 justify-center items-center bg-black/75 px-4">
        <View className="bg-white rounded-2xl w-full max-w-[520px] max-h-[85%] p-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold" style={{ color: colors.primary[600] }}>
              {t('Buy book')}
            </Text>
            <TouchableOpacity onPress={resetAndClose}>
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {book ? (
              <View className="mb-4">
                <Text className="font-semibold text-lg">{book.titulo}</Text>
                {!!book.autor && <Text>{t('Author')}: {book.autor}</Text>}
                {!!book.idioma && <Text>{t('Language')}: {book.idioma}</Text>}
                {!!book.nivel && <Text>{t('Level')}: {book.nivel}</Text>}
                {!!book.genero && <Text>{t('Genre')}: {book.genero}</Text>}
                {chaptersCount > 0 && <Text>{t('Chapters')}: {chaptersCount}</Text>}
                <Text className="mt-2 font-semibold">R$ {book.price || 0}</Text>
              </View>
            ) : null}
            {Platform.OS === 'ios' && (
              <Text className="mb-3" style={{ color: colors.gray[600] }}>
                {t('Please subscribe on the website')}
              </Text>
            )}
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2 bg-white"
              placeholder={t('Coupon code')}
              value={coupon}
              onChangeText={setCoupon}
            />
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white"
              placeholder={t('CPF or CNPJ')}
              value={cpfCnpj}
              onChangeText={setCpfCnpj}
              keyboardType="numeric"
            />
            {waiting ? (
              <Text className="mb-3" style={{ color: colors.gray[600] }}>
                {t('Complete the payment to unlock the book')}
              </Text>
            ) : null}
            <TouchableOpacity
              disabled={buying || !book}
              onPress={waiting ? checkPayment : buy}
              className="px-3 py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary[500] }}
            >
              {buying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">
                  {waiting ? t('I already paid') : t('Pay with Asaas')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
