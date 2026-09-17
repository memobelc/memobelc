import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

export type PlanCardPlan = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number | null;
  installment_count?: number;
  benefits?: string[];
  badge?: string;
  cycle?: string;
  trial_days?: number;
};

type PlanCardProps = {
  plan: PlanCardPlan;
  isCurrent?: boolean;
  actionLabel: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  compact?: boolean;
  ctaVariant?: 'subscribe' | 'switch';
};

type PressableVisualState = {
  pressed: boolean;
  hovered?: boolean;
};

export function formatPlanPrice(value: number) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PlanCard({
  plan,
  isCurrent,
  actionLabel,
  onAction,
  actionDisabled,
  compact,
  ctaVariant = 'subscribe',
}: PlanCardProps) {
  const { t } = useTranslation();
  const [ctaFocused, setCtaFocused] = useState(false);
  const installments = Number(plan.installment_count || 0);
  const installmentValue = installments > 1 ? Number(plan.price) / installments : 0;
  const original = Number(plan.original_price || 0);
  const showOriginal = original > Number(plan.price);
  const benefits = (plan.benefits || []).filter((item) => String(item).trim());
  const highlighted = !!isCurrent || !!plan.badge;
  const isSwitch = ctaVariant === 'switch';
  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/bc00b530-5fab-47e9-b067-96a2caa9e0db',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ba354b'},body:JSON.stringify({sessionId:'ba354b',runId:'post-fix',hypothesisId:'B',location:'src/components/molecules/PlanCard.tsx:render',message:'PlanCard rendered',data:{name:plan?.name,price:plan?.price,compact:!!compact},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return (
    <View
      style={[
        styles.shell,
        highlighted && styles.shellHighlighted,
        compact && styles.compact,
      ]}
    >
      <View style={[styles.card, highlighted && styles.cardHighlighted]}>
        <View className="flex-row items-start justify-between mb-2">
          <Text style={styles.name}>{plan.name}</Text>
          {!!plan.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{String(plan.badge).toUpperCase()}</Text>
            </View>
          )}
        </View>
        {!!plan.description && <Text style={styles.description}>{plan.description}</Text>}
        {showOriginal && (
          <Text style={styles.original}>{formatPlanPrice(original)}</Text>
        )}
        <Text style={styles.price}>{formatPlanPrice(Number(plan.price))}</Text>
        {installments > 1 && (
          <Text style={styles.installments}>
            {t('or {{count}}x of {{amount}}', {
              count: installments,
              amount: formatPlanPrice(installmentValue),
            })}
          </Text>
        )}
        {Number(plan.trial_days) > 0 && (
          <Text style={styles.trial}>
            {plan.trial_days} {t('trial days')}
          </Text>
        )}
        {benefits.map((item, index) => (
          <View key={`${item}-${index}`} className="flex-row items-center mt-2">
            <Ionicons name="checkmark-circle" size={18} color={colors.success[500]} />
            <Text style={styles.benefit}>{item}</Text>
          </View>
        ))}
        {isCurrent ? (
          <View style={styles.currentChip}>
            <Text style={styles.currentChipText}>{t('Current plan')}</Text>
          </View>
        ) : (
          <Pressable
            disabled={actionDisabled}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            accessibilityState={{ disabled: !!actionDisabled }}
            onFocus={() => setCtaFocused(true)}
            onBlur={() => setCtaFocused(false)}
            style={({ pressed, hovered }: PressableVisualState) => [
              styles.cta,
              isSwitch ? styles.ctaSwitch : styles.ctaSubscribe,
              actionDisabled && styles.ctaDisabled,
              {
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderWidth: 2,
                borderColor: ctaFocused ? colors.primary[600] : 'transparent',
                backgroundColor: isSwitch
                  ? pressed || hovered
                    ? colors.primary[600]
                    : colors.primary[500]
                  : pressed || hovered
                    ? colors.warning[600]
                    : colors.warning[500],
              },
              Platform.OS === 'web' ? { cursor: actionDisabled ? 'default' : 'pointer' } : null,
            ]}
          >
            <Text style={isSwitch ? styles.ctaSwitchText : styles.ctaSubscribeText}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexGrow: 1,
    minWidth: 260,
    maxWidth: 400,
  },
  shellHighlighted: {
    borderColor: colors.primary[500],
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  compact: {
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  cardHighlighted: {
    backgroundColor: colors.primary[50],
  },
  name: {
    color: colors.gray[900],
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.warning[500],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#1A1200',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  description: {
    color: colors.gray[600],
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  original: {
    color: colors.gray[500],
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  price: {
    color: colors.gray[900],
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
  },
  installments: {
    color: colors.primary[600],
    fontSize: 14,
    marginTop: 4,
  },
  trial: {
    color: colors.primary[600],
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  benefit: {
    color: colors.gray[700],
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  currentChip: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  currentChipText: {
    color: colors.primary[600],
    fontWeight: '700',
    fontSize: 14,
  },
  cta: {
    borderRadius: 999,
    marginTop: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaSubscribe: {
    backgroundColor: colors.warning[500],
  },
  ctaSwitch: {
    backgroundColor: colors.primary[500],
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaSubscribeText: {
    color: '#1A1200',
    fontWeight: '800',
    fontSize: 15,
  },
  ctaSwitchText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
});
