import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, Platform, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';

type PressableVisualState = {
  pressed: boolean;
  hovered?: boolean;
};

type NotificationListItemProps = {
  title: string;
  body?: string;
  isRead: boolean;
  timeLabel: string;
  onPress: () => void;
};

export default function NotificationListItem({
  title,
  body,
  isRead,
  timeLabel,
  onPress,
}: NotificationListItemProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(isRead ? 1 : 0);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      progress.value = isRead ? 1 : 0;
      return;
    }
    progress.value = withTiming(isRead ? 1 : 0, { duration: 280 });
  }, [isRead, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.primary[50], colors.white],
    ),
    borderLeftColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.primary[500], colors.gray[200]],
    ),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !isRead }}
      accessibilityLabel={`${title}. ${timeLabel}. ${isRead ? t('Read') : t('Unread')}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }: PressableVisualState) => ({
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: pressed ? 0.94 : 1,
        transform: [{ scale: pressed ? 0.997 : 1 }],
        borderWidth: 2,
        borderColor: focused ? colors.primary[500] : 'transparent',
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
      })}
    >
      {({ pressed, hovered }: PressableVisualState) => (
        <Animated.View entering={FadeIn.duration(220)} style={[styles.card, cardStyle]}>
          {(hovered || pressed) && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: pressed
                    ? 'rgba(2, 51, 116, 0.08)'
                    : 'rgba(2, 51, 116, 0.04)',
                },
              ]}
            />
          )}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              marginTop: 7,
              marginRight: 10,
              backgroundColor: isRead ? 'transparent' : colors.primary[500],
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 16,
                lineHeight: 22,
                fontWeight: isRead ? '500' : '700',
                color: isRead ? colors.gray[700] : colors.gray[900],
                marginBottom: body ? 4 : 8,
              }}
            >
              {title}
            </Text>
            {!!body && (
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: isRead ? colors.gray[500] : colors.gray[700],
                  marginBottom: 8,
                }}
              >
                {body}
              </Text>
            )}
            <Text
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: colors.gray[500],
                fontWeight: '500',
              }}
            >
              {timeLabel}
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
