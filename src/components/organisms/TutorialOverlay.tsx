import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import BrainSpeechBubble from '@/components/atoms/BrainSpeechBubble';
import { useTourTargets } from '@/contexts/TourTargetContext';
import type { Tutorial, TutorialStep } from '@/services/tutorials';

type TutorialOverlayProps = {
  tutorial: Tutorial;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onTap?: () => void;
};

export default function TutorialOverlay({
  tutorial,
  stepIndex,
  onNext,
  onBack,
  onSkip,
  onFinish,
  onTap,
}: TutorialOverlayProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { getRect, version } = useTourTargets();
  const steps = tutorial.steps || [];
  const step: TutorialStep | undefined = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const requiresTap = step?.interaction === 'tap';
  const tapLabel = String(step?.tap_label || '').trim();
  const liveRect = getRect(step?.target_key);
  const percent = step?.highlight_rect;
  const fallbackRect =
    percent && percent.width > 0 && percent.height > 0
      ? {
          x: percent.x * width,
          y: percent.y * height,
          width: percent.width * width,
          height: percent.height * height,
        }
      : null;
  const rect = liveRect || fallbackRect;
  const pad = 8;

  const hole = useMemo(() => {
    if (!rect || !step?.required_highlight) return null;
    return {
      x: Math.max(rect.x - pad, 0),
      y: Math.max(rect.y - pad, 0),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    };
  }, [rect, step?.required_highlight, version]);

  useEffect(() => {
    if (step?.title) {
      AccessibilityInfo.announceForAccessibility(
        `${step.title}. ${t('Step {{current}} of {{total}}', {
          current: stepIndex + 1,
          total: steps.length,
        })}`,
      );
    }
  }, [step?.title, stepIndex, steps.length, t]);

  if (!step) return null;

  const bubbleWidth = Math.min(width - 32, 420);
  let bubbleTop = height * 0.32;
  if (hole) {
    const placement = step.tooltip_placement || 'bottom';
    if (placement === 'top') {
      bubbleTop = Math.max(hole.y - 220, insets.top + 12);
    } else if (placement === 'bottom') {
      bubbleTop = Math.min(hole.y + hole.height + 16, height - 280);
    } else {
      bubbleTop = Math.min(Math.max(hole.y + hole.height + 12, insets.top + 80), height - 280);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={onSkip}
    >
      <View className="flex-1" pointerEvents="box-none">
        {hole ? (
          <>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: hole.y,
                backgroundColor: 'rgba(15,23,42,0.62)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: hole.y,
                left: 0,
                width: hole.x,
                height: hole.height,
                backgroundColor: 'rgba(15,23,42,0.62)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: hole.y,
                left: hole.x + hole.width,
                right: 0,
                height: hole.height,
                backgroundColor: 'rgba(15,23,42,0.62)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: hole.y + hole.height,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15,23,42,0.62)',
              }}
            />
            <TouchableOpacity
              onPress={requiresTap ? onTap : undefined}
              disabled={!requiresTap}
              accessibilityRole={requiresTap ? 'button' : undefined}
              accessibilityLabel={requiresTap ? tapLabel || t('Tap here') : undefined}
              style={{
                position: 'absolute',
                top: hole.y,
                left: hole.x,
                width: hole.width,
                height: hole.height,
                borderRadius: 16,
                borderWidth: 3,
                borderColor: colors.primary[400],
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 8,
              }}
            >
              {requiresTap && tapLabel ? (
                <View
                  style={{
                    backgroundColor: colors.primary[500],
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    maxWidth: hole.width - 8,
                  }}
                >
                  <Text className="text-white text-xs font-semibold text-center" numberOfLines={2}>
                    {tapLabel}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <MaterialIcons
              name="arrow-drop-down"
              size={36}
              color={colors.primary[400]}
              style={{
                position: 'absolute',
                top: hole.y + hole.height - 6,
                left: hole.x + hole.width / 2 - 18,
              }}
            />
          </>
        ) : (
          <View
            pointerEvents="none"
            style={{
              ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
              backgroundColor: 'rgba(15,23,42,0.62)',
            }}
          />
        )}

        <View
          style={{
            position: 'absolute',
            top: bubbleTop,
            left: (width - bubbleWidth) / 2,
            width: bubbleWidth,
          }}
        >
          <BrainSpeechBubble
            title={String(step.title || '')}
            body={String(step.body || '')}
            tip={step.tip ? String(step.tip) : undefined}
            expression={step.brain_expression || 'explaining'}
            icon={step.icon}
          />
          <Text className="text-white text-xs text-center mt-3 mb-2">
            {t('Step {{current}} of {{total}}', {
              current: stepIndex + 1,
              total: steps.length,
            })}
          </Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {stepIndex > 0 ? (
              <TouchableOpacity
                onPress={onBack}
                className="py-3 px-4 rounded-xl border border-white/40"
                accessibilityRole="button"
                accessibilityLabel={t('Back')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text className="text-white font-semibold">{t('Back')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={onSkip}
              className="py-3 px-4"
              accessibilityRole="button"
              accessibilityLabel={t('Skip tutorial')}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text className="text-white/90 underline">{t('Skip tutorial')}</Text>
            </TouchableOpacity>
            {requiresTap ? (
              hole ? (
                <View className="flex-1 py-3 items-center justify-center">
                  <Text className="text-white/90 text-xs text-center">
                    {tapLabel || t('Tap the highlighted area to continue')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={onTap}
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: colors.primary[500], minHeight: 44, justifyContent: 'center' }}
                >
                  <Text className="text-center text-white font-bold">
                    {tapLabel || t('Tap here')}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
            <TouchableOpacity
              onPress={isLast ? onFinish : onNext}
              className="flex-1 py-3 rounded-xl"
              style={{ backgroundColor: colors.primary[500], minHeight: 44, justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={isLast ? t('Finish') : t('Next')}
            >
              <Text className="text-center text-white font-bold">
                {isLast ? t('Finish') : t('Next')}
              </Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
