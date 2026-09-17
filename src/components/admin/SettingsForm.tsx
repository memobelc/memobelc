import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import type { SystemSetting } from '@/services/systemSettings';

const GROUPS = [
  { titleKey: 'AI settings', keys: ['GENAI_API_KEY', 'GENAI_MODEL'] },
  { titleKey: 'Payment settings', keys: ['ASAAS_API_KEY', 'ASAAS_API_URL', 'ASAAS_WEBHOOK_TOKEN'] },
  {
    titleKey: 'Email settings',
    keys: ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_DEFAULT_SENDER'],
  },
];

type SettingsFormProps = {
  items: SystemSetting[];
  values: Record<string, string>;
  errors: Record<string, string>;
  saving: boolean;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
};

export default function SettingsForm({
  items,
  values,
  errors,
  saving,
  onChange,
  onSave,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const byKey = useMemo(
    () => Object.fromEntries(items.map((item) => [item.key, item])),
    [items],
  );

  return (
    <View>
      {GROUPS.map((group) => (
        <View key={group.titleKey} className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-lg font-bold mb-3" style={{ color: colors.primary[500] }}>
            {t(group.titleKey)}
          </Text>
          {group.keys.map((key) => {
            const meta = byKey[key];
            const isSensitive = meta?.is_sensitive;
            const shown = !!visible[key];
            return (
              <View key={key} className="mb-3">
                <Text className="mb-1 font-semibold">{key}</Text>
                <View className="flex-row items-center border border-gray-200 rounded-lg px-3">
                  <TextInput
                    value={values[key] ?? ''}
                    onChangeText={(value) => onChange(key, value)}
                    secureTextEntry={!!isSensitive && !shown}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 py-2"
                    keyboardType={key === 'MAIL_PORT' ? 'number-pad' : 'default'}
                  />
                  {isSensitive ? (
                    <TouchableOpacity
                      onPress={() => setVisible((prev) => ({ ...prev, [key]: !shown }))}
                      className="p-2 flex-row items-center"
                      accessibilityLabel={shown ? t('Hide') : t('Show')}
                    >
                      <FontAwesome
                        name={shown ? 'eye' : 'eye-slash'}
                        size={18}
                        color={colors.primary[500]}
                      />
                      <Text className="ml-1 text-xs" style={{ color: colors.primary[500] }}>
                        {shown ? t('Hide') : t('Show')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {meta?.updated_by ? (
                  <Text className="text-xs text-gray-500 mt-1">
                    {t('Last updated by')} {meta.updated_by}
                  </Text>
                ) : null}
                {errors[key] ? (
                  <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
                    {errors[key]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        className="py-2.5 rounded-lg items-center"
        style={{ backgroundColor: colors.primary[500] }}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold">{t('Save')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
