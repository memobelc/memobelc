import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { supportedLanguages } from '@/locales/i18n';
import { getFlagUri, LANGUAGE_FLAG_CODES } from '@/utils/languageFlags';
import { colors } from '@/styles/colors';

export type LanguageOption = { code: string; label: string };

interface LanguageSelectWithFlagsProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: LanguageOption[];
  className?: string;
  /** Smaller trigger (flag + text) for mobile */
  compact?: boolean;
}

const defaultOptions: LanguageOption[] = supportedLanguages.map(({ code, label }) => ({
  code,
  label,
}));

/**
 * Select that shows flag + text in the trigger and in each option (modal list).
 */
export function LanguageSelectWithFlags({
  value,
  onValueChange,
  options = defaultOptions,
  className,
  compact = false,
}: LanguageSelectWithFlagsProps) {
  const [open, setOpen] = useState(false);

  const currentOption = options.find((o) => o.code === value) ?? options[0];
  const currentFlagCode = LANGUAGE_FLAG_CODES[currentOption.code] ?? 'US';
  const currentFlagUri = getFlagUri(currentFlagCode);

  const handleSelect = (code: string) => {
    onValueChange(code);
    setOpen(false);
  };

  const flagSize = compact ? 20 : 28;
  const flagMargin = compact ? 6 : 10;

  return (
    <View className={className ?? 'w-full'}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className={`flex-row items-center border border-gray-200 rounded-lg ${compact ? 'px-2 py-1.5 min-h-[36px]' : 'px-3 py-2.5 min-h-[50px]'}`}
      >
        <Image
          source={{ uri: currentFlagUri }}
          style={{ width: flagSize, height: flagSize, marginRight: flagMargin }}
          resizeMode="cover"
        />
        <Text
          className="text-primary flex-1"
          style={compact ? { fontSize: 13 } : undefined}
          numberOfLines={1}
        >
          {currentOption.label}
        </Text>
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
                  maxWidth: 320,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                {options.map((opt) => {
                  const flagCode = LANGUAGE_FLAG_CODES[opt.code] ?? 'US';
                  const isSelected = value === opt.code;
                  return (
                    <TouchableOpacity
                      key={opt.code}
                      onPress={() => handleSelect(opt.code)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        backgroundColor: isSelected
                          ? (colors.gray[200] ?? '#E4E4E7')
                          : 'transparent',
                        borderRadius: 8,
                        marginVertical: 2,
                      }}
                    >
                      <Image
                        source={{ uri: getFlagUri(flagCode) }}
                        style={{ width: 32, height: 32, marginRight: 12 }}
                        resizeMode="cover"
                      />
                      <Text
                        className="text-primary"
                        style={{ fontSize: 16 }}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
