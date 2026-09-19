import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { BRAIN_EXPRESSIONS } from '@/constants/brain';
import type { BrainAvatar, BrainExpression } from '@/services/tutorials';
import BrainAvatarView from '@/components/atoms/BrainAvatar';

type AvatarOption = {
  key: string;
  name: string;
  image?: string | null;
};

type BrainAvatarSelectProps = {
  value?: string;
  onValueChange: (value: BrainExpression) => void;
  catalog?: BrainAvatar[] | null;
  label?: string;
};

function optionLabel(key: string, name?: string) {
  if (name && name !== key) return name;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function BrainAvatarSelect({
  value,
  onValueChange,
  catalog,
  label,
}: BrainAvatarSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const options = useMemo<AvatarOption[]>(() => {
    const fromCatalog = (catalog || []).filter((item) => item.is_active !== false);
    const seen = new Set(fromCatalog.map((item) => item.key));
    const extras = BRAIN_EXPRESSIONS.filter((key) => !seen.has(key)).map((key) => ({
      key,
      name: optionLabel(key),
    }));
    return [
      ...fromCatalog.map((item) => ({
        key: item.key,
        name: optionLabel(item.key, item.name),
        image: item.image,
      })),
      ...extras,
    ];
  }, [catalog]);

  const selected = options.find((item) => item.key === value) || options[0];

  const handleSelect = (key: string) => {
    onValueChange(key as BrainExpression);
    setOpen(false);
  };

  return (
    <View className="w-full mb-2">
      <Text className="text-xs text-gray-500 mb-1">{label || t('Brain avatar')}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label || t('Brain avatar')}
        className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2 min-h-[50px]"
      >
        {selected ? (
          <>
            <BrainAvatarView
              expression={selected.key}
              uri={selected.image}
              catalog={catalog}
              size={36}
            />
            <Text className="flex-1 ml-3" numberOfLines={1}>
              {selected.name}
            </Text>
          </>
        ) : (
          <Text className="flex-1 text-gray-400">{t('Brain avatar')}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.gray[500]} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.surface ?? '#fff',
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  width: '100%',
                  maxWidth: 360,
                  maxHeight: '80%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Text className="font-semibold px-3 py-2">{label || t('Brain avatar')}</Text>
                <ScrollView>
                  {options.map((opt) => {
                    const isSelected = selected?.key === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => handleSelect(opt.key)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          backgroundColor: isSelected
                            ? (colors.gray[200] ?? '#E4E4E7')
                            : 'transparent',
                          borderRadius: 8,
                          marginVertical: 2,
                        }}
                      >
                        <BrainAvatarView
                          expression={opt.key}
                          uri={opt.image}
                          catalog={catalog}
                          size={48}
                        />
                        <Text className="flex-1 ml-3" style={{ fontSize: 16 }} numberOfLines={1}>
                          {opt.name}
                        </Text>
                        {isSelected ? (
                          <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
