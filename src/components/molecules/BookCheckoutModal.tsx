import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useEntitlements } from '@/contexts/EntitlementContext';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';
import api from '@/services/api';

export type CheckoutBook = {
  _id: string;
  titulo: string;
  autor?: string;
  idioma?: string;
  nivel?: string;
  genero?: string;
  price?: number;
  coins_enabled?: boolean;
  coin_price?: number;
  chapters?: { titulo?: string }[];
};

type BookCheckoutModalProps = {
  visible: boolean;
  book: CheckoutBook | null;
  onClose: () => void;
  onUnlocked: () => void;
};

export default function BookCheckoutModal({
  visible,
  book,
  onClose,
  onUnlocked,
}: BookCheckoutModalProps) {
  const { t } = useTranslation();
  const { userInfo, updateUserInfo } = useSession();
  const { toast } = useToast();
  const { refresh } = useEntitlements();
  const [showAsaas, setShowAsaas] = useState(false);
  const [buyingCoins, setBuyingCoins] = useState(false);
  const chaptersCount = book?.chapters?.length || 0;
  const coinsEnabled = !!book?.coins_enabled && (book?.coin_price || 0) > 0;
  const hasMoneyPrice = !!book && !!(book.price && Number(book.price) > 0);
  const coinPrice = book?.coin_price || 0;
  const balance = userInfo?.coins ?? 0;

  const confirmUnlock = async () => {
    await refresh();
    onUnlocked();
    toast({ message: t('Book unlocked'), variant: 'success' });
  };

  const buyWithCoins = async () => {
    if (!book || !userInfo?.token) return;
    if (balance < coinPrice) {
      toast({ message: t('Insufficient coins'), variant: 'destructive' });
      return;
    }
    try {
      setBuyingCoins(true);
      const response = await api.post(
        '/books/purchase-with-coins',
        { book_id: book._id },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      if (typeof response.data?.coins === 'number') {
        updateUserInfo({ coins: response.data.coins });
      }
      await confirmUnlock();
      onClose();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error purchasing with coins'),
        variant: 'destructive',
      });
    } finally {
      setBuyingCoins(false);
    }
  };

  const closeAll = () => {
    setShowAsaas(false);
    onClose();
  };

  if (!coinsEnabled) {
    return (
      <AsaasPaySheet
        visible={visible && !!book}
        onClose={onClose}
        token={userInfo?.token}
        productType="book"
        productId={book?._id}
        title={t('Buy book')}
        header={
          book ? (
            <View className="mb-4">
              <Text className="font-semibold text-lg">{book.titulo}</Text>
              {!!book.autor && <Text>{t('Author')}: {book.autor}</Text>}
              {!!book.idioma && <Text>{t('Language')}: {book.idioma}</Text>}
              {!!book.nivel && <Text>{t('Level')}: {book.nivel}</Text>}
              {!!book.genero && <Text>{t('Genre')}: {book.genero}</Text>}
              {chaptersCount > 0 && <Text>{t('Chapters')}: {chaptersCount}</Text>}
              <Text className="mt-2 font-semibold" style={{ color: colors.primary[600] }}>
                R$ {book.price || 0}
              </Text>
            </View>
          ) : null
        }
        onSuccess={confirmUnlock}
      />
    );
  }

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={visible && !!book && !showAsaas}
        onRequestClose={closeAll}
      >
        <View className="flex-1 justify-center items-center bg-black/75 px-4">
          <View className="bg-white rounded-2xl w-full max-w-[520px] p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold" style={{ color: colors.primary[600] }}>
                {t('Buy book')}
              </Text>
              <TouchableOpacity onPress={closeAll}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            {book ? (
              <View className="mb-4">
                <Text className="font-semibold text-lg">{book.titulo}</Text>
                {!!book.autor && <Text>{t('Author')}: {book.autor}</Text>}
                {!!book.idioma && <Text>{t('Language')}: {book.idioma}</Text>}
                {!!book.nivel && <Text>{t('Level')}: {book.nivel}</Text>}
                {!!book.genero && <Text>{t('Genre')}: {book.genero}</Text>}
                {chaptersCount > 0 && <Text>{t('Chapters')}: {chaptersCount}</Text>}
              </View>
            ) : null}
            <Text className="text-sm mb-3" style={{ color: colors.gray[600] }}>
              {t('Your coins')}: {balance}
            </Text>
            <TouchableOpacity
              onPress={buyWithCoins}
              disabled={buyingCoins}
              className="py-3 rounded-lg items-center mb-2"
              style={{ backgroundColor: colors.primary[500] }}
            >
              {buyingCoins ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">
                  {t('Buy with coins')} ({coinPrice})
                </Text>
              )}
            </TouchableOpacity>
            {hasMoneyPrice ? (
              <TouchableOpacity
                onPress={() => setShowAsaas(true)}
                className="py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold" style={{ color: colors.gray[800] }}>
                  {t('Pay with PIX or card')} · R$ {book?.price || 0}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
      <AsaasPaySheet
        visible={showAsaas && !!book}
        onClose={() => setShowAsaas(false)}
        token={userInfo?.token}
        productType="book"
        productId={book?._id}
        title={t('Buy book')}
        header={
          book ? (
            <View className="mb-4">
              <Text className="font-semibold text-lg">{book.titulo}</Text>
              <Text className="mt-2 font-semibold" style={{ color: colors.primary[600] }}>
                R$ {book.price || 0}
              </Text>
            </View>
          ) : null
        }
        onSuccess={async () => {
          setShowAsaas(false);
          await confirmUnlock();
        }}
      />
    </>
  );
}
