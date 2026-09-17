import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
}: PlanCardProps) {
  const { t } = useTranslation();
  const installments = Number(plan.installment_count || 0);
  const installmentValue = installments > 1 ? Number(plan.price) / installments : 0;
  const original = Number(plan.original_price || 0);
  const showOriginal = original > Number(plan.price);
  const benefits = (plan.benefits || []).filter((item) => String(item).trim());
  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/bc00b530-5fab-47e9-b067-96a2caa9e0db',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ba354b'},body:JSON.stringify({sessionId:'ba354b',runId:'post-fix',hypothesisId:'B',location:'src/components/molecules/PlanCard.tsx:render',message:'PlanCard rendered',data:{name:plan?.name,price:plan?.price,compact:!!compact},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return (
    <View style={[styles.glow, compact && styles.compact]}>
      <View style={styles.card}>
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
          <Text style={styles.current}>{t('Current plan')}</Text>
        ) : (
          <TouchableOpacity
            disabled={actionDisabled}
            onPress={onAction}
            style={[styles.cta, actionDisabled && styles.ctaDisabled]}
          >
            <Text style={styles.ctaText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: 28,
    padding: 1.5,
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    flexGrow: 1,
    minWidth: 260,
    maxWidth: 400,
  },
  compact: {
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: 'rgba(33, 154, 231, 0.45)',
  },
  name: {
    color: colors.primary[500],
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 10,
  },
  original: {
    color: '#94A3B8',
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  price: {
    color: colors.info[500],
    fontSize: 36,
    fontWeight: '800',
    marginTop: 2,
  },
  installments: {
    color: '#04418b',
    fontSize: 14,
    marginTop: 2,
  },
  trial: {
    color: '#4e9bf3',
    fontSize: 13,
    marginTop: 8,
  },
  benefit: {
    color: '#388bf8',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  current: {
    color: colors.primary[300],
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 18,
  },
  cta: {
    backgroundColor: colors.warning[500],
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 18,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#1A1200',
    fontWeight: '800',
    fontSize: 15,
  },
});
