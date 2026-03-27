import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

const SPRING_CONFIG = { damping: 32, stiffness: 300 };
const SHEET_RADIUS = 20; // ponta arredondada da folha

type FlipBookProps = {
  images: string[];
  onLastPageReached?: () => void;
  onToggleRead?: () => void;
  isRead?: boolean;
};

export default function FlipBook({
  images,
  onLastPageReached,
  onToggleRead,
  isRead,
}: FlipBookProps) {
  const { t } = useTranslation();

  const [layout, setLayout] = useState({ width: 400, height: 600 });
  const width = layout.width;
  const height = layout.height;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) setLayout({ width: w, height: h });
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const slideProgress = useSharedValue(0);
  const direction = useSharedValue(1); // 1 = indo para próxima, -1 = voltando

  const commitSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + direction.value;
      const clamped = Math.max(0, Math.min(next, images.length - 1));
      if (clamped === images.length - 1 && clamped !== prev) {
        onLastPageReached?.();
      }
      return clamped;
    });
    slideProgress.value = 0;
  }, [images.length, direction, onLastPageReached]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const dx = event.translationX;
      if (dx < 0 && currentIndex < images.length - 1) {
        direction.value = 1;
        slideProgress.value = Math.min(1, -dx / (width * 0.85));
      } else if (dx > 0 && currentIndex > 0) {
        direction.value = -1;
        slideProgress.value = Math.min(1, dx / (width * 0.85));
      }
    })
    .onEnd((event) => {
      const shouldCommit =
        slideProgress.value > 0.35 || Math.abs(event.velocityX) > 150;
      if (
        shouldCommit &&
        ((direction.value === 1 && currentIndex < images.length - 1) ||
          (direction.value === -1 && currentIndex > 0))
      ) {
        slideProgress.value = withTiming(1, { duration: 240 }, () => {
          runOnJS(commitSlide)();
        });
      } else {
        slideProgress.value = withSpring(0, SPRING_CONFIG);
      }
    });

  if (images.length === 0) return null;

  // Pilha: a página "de baixo" é a que fica fixa; a "de cima" é a folha que desliza
  // Indo para próxima (arrasta esquerda): embaixo = próxima, em cima = atual (desliza pra esquerda)
  // Voltando (arrasta direita): embaixo = atual, em cima = anterior (entra da esquerda)
  const underIndex = direction.value === 1 ? currentIndex + 1 : currentIndex;
  const topIndex = direction.value === 1 ? currentIndex : currentIndex - 1;

  const hasUnder = underIndex >= 0 && underIndex < images.length;
  const hasTop = topIndex >= 0 && topIndex < images.length;

  // Folha em cima: desliza para a esquerda (próxima) ou da esquerda para o lugar (volta)
  const topSheetStyle = useAnimatedStyle(() => {
    const translateX =
      direction.value === 1
        ? interpolate(slideProgress.value, [0, 1], [0, -width])
        : interpolate(slideProgress.value, [0, 1], [-width, 0]);
    return {
      transform: [{ translateX }],
      zIndex: 1,
      borderTopRightRadius: direction.value === 1 ? SHEET_RADIUS : 0,
      borderBottomRightRadius: direction.value === 1 ? SHEET_RADIUS : 0,
      borderTopLeftRadius: direction.value === -1 ? SHEET_RADIUS : 0,
      borderBottomLeftRadius: direction.value === -1 ? SHEET_RADIUS : 0,
      overflow: 'hidden' as const,
      ...(Platform.OS !== 'web' && {
        shadowColor: '#000',
        shadowOffset: { width: direction.value === 1 ? -3 : 3, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
      }),
    };
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.bookContainer, { width, height }]} collapsable={false}>
          <View style={[styles.stack, { width, height }]}>
            {/* Camada de baixo: página que permanece no lugar */}
            {hasUnder && (
              <View style={[styles.pageUnder, { width, height }]} pointerEvents="none">
                <Image
                  source={{ uri: images[underIndex] }}
                  style={[styles.image, { width, height }]}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Folha em cima que desliza (efeito Kindle) */}
            {hasTop && (
              <Animated.View
                style={[styles.sheet, { width, height }, topSheetStyle]}
                pointerEvents="box-none"
              >
                <Image
                  source={{ uri: images[topIndex] }}
                  style={[styles.image, { width, height }]}
                  resizeMode="contain"
                />
              </Animated.View>
            )}
          </View>
        </View>
      </GestureDetector>

      <View style={styles.indicator}>
        <View style={styles.indicatorInner}>
          <Text style={styles.indicatorText}>
            {t('Page')} {currentIndex + 1} {t('of')} {images.length}
          </Text>
          {onToggleRead && currentIndex === images.length - 1 && (
            <View style={styles.readButtonContainer}>
              <Text
                onPress={onToggleRead}
                style={styles.readButtonText}
              >
                {isRead ? t('Mark as unread') : t('Mark as read')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  bookContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  stack: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pageUnder: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#ffffff',
  },
  image: {
    backgroundColor: 'transparent',
  },
  indicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  indicatorText: {
    fontSize: 13,
    color: colors.gray[400],
  },
  readButtonContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
  },
  readButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
});
