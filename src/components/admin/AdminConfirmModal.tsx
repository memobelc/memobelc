import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

export default function AdminConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-4"
        onPress={onCancel}
      >
        <Pressable
          className="w-full max-w-md bg-white rounded-2xl p-5"
          onPress={(event) => event.stopPropagation?.()}
        >
          <Text className="text-lg font-bold mb-2" style={{ color: colors.gray[900] }}>
            {title}
          </Text>
          <Text className="mb-5" style={{ color: colors.gray[600] }}>
            {message}
          </Text>
          <View className="flex-row justify-end">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t('Cancel')}
              style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.gray[700] }}>{t('Cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel || t('Confirm')}
              style={{
                minHeight: 44,
                paddingHorizontal: 16,
                borderRadius: 10,
                justifyContent: 'center',
                backgroundColor: destructive ? colors.error[500] : colors.primary[500],
              }}
            >
              <Text className="text-white font-semibold">{confirmLabel || t('Confirm')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
