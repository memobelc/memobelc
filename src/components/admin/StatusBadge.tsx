import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

const TONES: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: colors.success[100], fg: colors.success[700], label: 'Active' },
  trialing: { bg: colors.info[100], fg: colors.info[700], label: 'Trialing' },
  pending: { bg: colors.warning[100], fg: '#854D0E', label: 'Pending' },
  overdue: { bg: colors.orange[100], fg: colors.orange[800], label: 'Overdue' },
  canceled: { bg: colors.error[100], fg: colors.error[700], label: 'Canceled' },
  cancelled: { bg: colors.error[100], fg: colors.error[700], label: 'Canceled' },
  expired: { bg: colors.gray[200], fg: colors.gray[700], label: 'Expired' },
  refunded: { bg: colors.violet[100], fg: colors.violet[800], label: 'Refunded' },
  refused: { bg: colors.error[100], fg: colors.error[700], label: 'Refused' },
  failed: { bg: colors.error[100], fg: colors.error[700], label: 'Failed' },
  suspended: { bg: colors.gray[200], fg: colors.gray[700], label: 'Suspended' },
  confirmed: { bg: colors.success[100], fg: colors.success[700], label: 'Confirmed' },
  received: { bg: colors.success[100], fg: colors.success[700], label: 'Confirmed' },
  paid: { bg: colors.success[100], fg: colors.success[700], label: 'Confirmed' },
  inactive: { bg: colors.gray[200], fg: colors.gray[700], label: 'Inactive' },
  draft: { bg: colors.warning[100], fg: '#854D0E', label: 'Draft' },
  archived: { bg: colors.gray[200], fg: colors.gray[700], label: 'Archived' },
};

export function statusTone(status?: string) {
  const key = (status || '').toLowerCase();
  return TONES[key] || { bg: colors.gray[200], fg: colors.gray[700], label: status || 'Status' };
}

export default function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useTranslation();
  const tone = statusTone(status);
  return (
    <View
      className="self-start px-2 py-1 rounded-full"
      style={{ backgroundColor: tone.bg }}
      accessibilityRole="text"
      accessibilityLabel={t(tone.label)}
    >
      <Text className="text-xs font-semibold" style={{ color: tone.fg }}>
        {t(tone.label)}
      </Text>
    </View>
  );
}
