import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/contexts/profileContext';
import { supportedLanguages } from '@/locales/i18n';
import { colors } from '@/styles/colors';
import { getFlagUri, LANGUAGE_FLAG_CODES } from '@/utils/languageFlags';

/**
 * Discreet language picker for auth screens: small flag in the top-right corner.
 * Tap to open a small modal with all language flags. Must be inside ProfileProvider.
 */
export function AuthLanguagePicker() {
  const { language, setLanguage } = useProfile();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const currentLanguage = language ?? i18n.language ?? 'en';
  const currentFlagCode = LANGUAGE_FLAG_CODES[currentLanguage] ?? 'US';
  const currentFlagUri = getFlagUri(currentFlagCode);
  const topOffset = Platform.OS === 'web' ? 8 : Math.max(insets.top, 8);

  const handleSelect = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: topOffset,
        right: 12,
        zIndex: 10,
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.4)',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: currentFlagUri }}
          style={{ width: 28, height: 28 }}
          resizeMode="cover"
        />
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
              justifyContent: 'flex-start',
              alignItems: 'flex-end',
              paddingTop: topOffset + 44,
              paddingRight: 12,
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.surface ?? '#fff',
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  minWidth: 52,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                {supportedLanguages.map(({ code }) => (
                  <TouchableOpacity
                    key={code}
                    onPress={() => handleSelect(code)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        currentLanguage === code
                          ? colors.gray[200] ?? '#E4E4E7'
                          : 'transparent',
                      borderRadius: 8,
                      marginVertical: 2,
                    }}
                  >
                    <Image
                      source={{
                        uri: getFlagUri(LANGUAGE_FLAG_CODES[code] ?? 'US'),
                      }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
