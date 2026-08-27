import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useEntitlements } from '@/contexts/EntitlementContext';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';

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

export default function BookCheckoutModal({ visible, book, onClose, onUnlocked }: BookCheckoutModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { refresh } = useEntitlements();
  const chaptersCount = book?.chapters?.length || 0;

  const confirmUnlock = async () => {
    await refresh();
    onUnlocked();
    toast({ message: t('Book unlocked'), variant: 'success' });
  };

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
