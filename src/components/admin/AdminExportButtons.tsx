import { Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

export default function AdminExportButtons({
  onCsv,
  onXlsx,
  disabled,
}: {
  onCsv: () => void;
  onXlsx: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap">
      {(['csv', 'xlsx'] as const).map((fmt) => (
        <Pressable
          key={fmt}
          disabled={disabled}
          onPress={fmt === 'csv' ? onCsv : onXlsx}
          accessibilityRole="button"
          accessibilityLabel={fmt === 'csv' ? t('Export CSV') : t('Export Excel')}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 14,
            marginRight: 8,
            marginBottom: 8,
            borderRadius: 10,
            justifyContent: 'center',
            backgroundColor: pressed ? colors.gray[300] : colors.gray[200],
            opacity: disabled ? 0.5 : 1,
            ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Text className="font-semibold" style={{ color: colors.gray[800] }}>
            {fmt === 'csv' ? t('Export CSV') : t('Export Excel')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
