import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { StarRating } from '@/components/molecules/StarRating';

type ModuleRatingModalProps = {
  visible: boolean;
  moduleName: string;
  saving?: boolean;
  onConfirm: (stars: number) => void;
  onDismiss: () => void;
};

export function ModuleRatingModal({
  visible,
  moduleName,
  saving = false,
  onConfirm,
  onDismiss,
}: ModuleRatingModalProps) {
  const { t } = useTranslation();
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    if (visible) setStars(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.overlay.medium }}
      >
        <View
          className="w-full max-w-[420px] rounded-2xl p-6"
          style={{ backgroundColor: colors.white }}
        >
          <Text className="text-lg font-bold text-gray-800 text-center">
            {t('How was this module?')}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1 mb-5" numberOfLines={2}>
            {moduleName}
          </Text>

          <View className="items-center mb-6">
            <StarRating value={stars} onChange={setStars} size={36} />
          </View>

          <TouchableOpacity
            onPress={() => stars && onConfirm(stars)}
            disabled={!stars || saving}
            className="rounded-xl py-3 items-center mb-3"
            style={{
              backgroundColor: stars ? colors.primary[500] : colors.gray[300],
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-bold text-white">{t('Confirm')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} disabled={saving} className="py-2 items-center">
            <Text className="font-semibold" style={{ color: colors.gray[500] }}>
              {t('Not now')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
