import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';

export type PublishStatus = 'draft' | 'published' | 'scheduled';

export function toDatetimeLocalValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface PublishStatusFieldsProps {
  status: PublishStatus;
  scheduledAt: string;
  onStatusChange: (status: PublishStatus) => void;
  onScheduledAtChange: (value: string) => void;
}

export function PublishStatusFields({
  status,
  scheduledAt,
  onStatusChange,
  onScheduledAtChange,
}: PublishStatusFieldsProps) {
  const { t } = useTranslation();
  const options: { value: PublishStatus; label: string }[] = [
    { value: 'draft', label: t('Draft') },
    { value: 'published', label: t('Published') },
    { value: 'scheduled', label: t('Scheduled') },
  ];

  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold mb-2" style={{ color: colors.gray[700] }}>
        {t('Visibility status')}
      </Text>
      <View className="flex-row gap-2 mb-2">
        {options.map((option) => {
          const selected = status === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onStatusChange(option.value)}
              className="flex-1 rounded-xl py-2 items-center"
              style={{
                backgroundColor: selected ? colors.primary[50] : colors.gray[100],
                borderWidth: 1,
                borderColor: selected ? colors.primary[500] : colors.gray[200],
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: selected ? colors.primary[600] : colors.gray[600] }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {status === 'scheduled' && (
        <View>
          <Text className="text-xs mb-1" style={{ color: colors.gray[600] }}>
            {t('Publish at')}
          </Text>
          <View className="flex-row items-center rounded-xl px-3 py-2" style={{ backgroundColor: colors.gray[100] }}>
            <MaterialIcons name="schedule" size={16} color={colors.gray[500]} />
            <TextInput
              className="flex-1 ml-2"
              value={scheduledAt}
              onChangeText={onScheduledAtChange}
              placeholder="YYYY-MM-DDTHH:mm"
              {...(Platform.OS === 'web' ? { type: 'datetime-local' } as any : {})}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function statusBadgeStyle(status?: string | null) {
  if (status === 'draft') {
    return { bg: colors.gray[200], color: colors.gray[700], labelKey: 'Draft' as const };
  }
  if (status === 'scheduled') {
    return { bg: colors.warning[100], color: colors.warning[700], labelKey: 'Scheduled' as const };
  }
  return { bg: colors.primary[50], color: colors.primary[700], labelKey: 'Published' as const };
}
