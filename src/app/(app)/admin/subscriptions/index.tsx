import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { useNow } from '@/hooks/useNow';
import { billingApi, downloadBillingExport } from '@/services/billing';
import { formatPlanPrice } from '@/components/molecules/PlanCard';
import { formatDisplayDate } from '@/utils/formatFriendlyDate';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminDataTable, { type AdminColumn } from '@/components/admin/AdminDataTable';
import AdminExportButtons from '@/components/admin/AdminExportButtons';
import AdminUserCell from '@/components/admin/AdminUserCell';
import AdminConfirmModal from '@/components/admin/AdminConfirmModal';

const PAGE_SIZE = 20;
const STATUSES = ['', 'active', 'trialing', 'pending', 'overdue', 'canceled', 'expired'];
const METHODS = ['', 'PIX', 'CREDIT_CARD', 'BOLETO'];
const FAILURE_KEYS: Record<string, string> = {
  card_refused: 'Card declined',
  insufficient_funds: 'Insufficient funds',
  pix_expired: 'PIX expired',
  boleto_overdue: 'Boleto overdue',
  processing_error: 'Processing error',
  communication_failure: 'Communication failure',
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: active ? colors.primary[500] : pressed ? colors.gray[300] : colors.gray[200],
      })}
    >
      <Text style={{ color: active ? colors.white : colors.gray[800], fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      onChange: (event: any) => onChange(event.target.value),
      className: 'border border-gray-200 rounded-lg px-3 py-2 mr-2 mb-2 bg-white',
      style: { minHeight: 44, minWidth: 160 },
      placeholder,
    });
  }
  return (
    <TextInput
      className="border border-gray-200 rounded-lg px-3 py-2 mr-2 mb-2 bg-white"
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      style={{ minHeight: 44, minWidth: 160 }}
    />
  );
}

export default function AdminSubscriptionsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const now = useNow(30_000);

  const [summary, setSummary] = useState<any>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [pays, setPays] = useState<any[]>([]);
  const [paysTotal, setPaysTotal] = useState(0);
  const [grants, setGrants] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingPays, setLoadingPays] = useState(true);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState('');
  const [statusGroup, setStatusGroup] = useState('');
  const [method, setMethod] = useState('');
  const [expiring, setExpiring] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateField, setDateField] = useState('created_at');
  const [subSort, setSubSort] = useState('-created_at');
  const [subPage, setSubPage] = useState(0);
  const [paySort, setPaySort] = useState('-created_at');
  const [payPage, setPayPage] = useState(0);
  const [failedOnly, setFailedOnly] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [payDetail, setPayDetail] = useState<any>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: string } | null>(null);
  const [grantSearch, setGrantSearch] = useState('');
  const [userHits, setUserHits] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [grantPlan, setGrantPlan] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [granting, setGranting] = useState(false);

  const fmt = (value: any) => formatDisplayDate(value, t, { locale: i18n.language });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);

  const subParams = useMemo(() => {
    const params: Record<string, unknown> = {
      skip: subPage * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort: subSort,
    };
    if (debouncedQ) params.q = debouncedQ;
    if (planId) params.plan_id = planId;
    if (status) params.status = status;
    else if (statusGroup) params.status_group = statusGroup;
    if (method) params.payment_method = method;
    if (expiring) params.expiring_in_days = expiring;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (dateFrom || dateTo) params.date_field = dateField;
    return params;
  }, [debouncedQ, planId, status, statusGroup, method, expiring, dateFrom, dateTo, dateField, subSort, subPage]);

  const payParams = useMemo(() => {
    const params: Record<string, unknown> = {
      skip: payPage * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort: paySort,
    };
    if (debouncedQ) params.q = debouncedQ;
    if (failedOnly) params.failed_only = 'true';
    return params;
  }, [debouncedQ, failedOnly, paySort, payPage]);

  const load = useCallback(async (silent = false) => {
    if (!userInfo?.token) return;
    try {
      if (!silent) {
        setLoadingSubs(true);
        setLoadingPays(true);
      }
      const [sum, planRes, subRes, payRes, grantRes] = await Promise.all([
        billingApi.billingSummary(userInfo.token),
        billingApi.adminPlans(userInfo.token),
        billingApi.subscriptions(userInfo.token, subParams),
        billingApi.paymentsAdmin(userInfo.token, payParams),
        billingApi.listGrants(userInfo.token, { limit: 30 }),
      ]);
      setSummary(sum.data || {});
      setPlans(planRes.data.plans || []);
      setSubs(subRes.data.subscriptions || []);
      setSubsTotal(subRes.data.total || 0);
      setPays(payRes.data.payments || []);
      setPaysTotal(payRes.data.total || 0);
      setGrants(grantRes.data.grants || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading data'), variant: 'destructive' });
    } finally {
      setLoadingSubs(false);
      setLoadingPays(false);
    }
  }, [userInfo?.token, subParams, payParams, t]);

  useEffect(() => {
    if (isAdmin) load(true);
  }, [isAdmin, load, now]);

  useEffect(() => {
    setSubPage(0);
  }, [debouncedQ, planId, status, statusGroup, method, expiring, dateFrom, dateTo, dateField, subSort]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!userInfo?.token || grantSearch.trim().length < 2) {
        setUserHits([]);
        return;
      }
      try {
        const res = await billingApi.adminUsers(userInfo.token, grantSearch.trim());
        const users = (res.data.users || []).slice(0, 8);
        const previews = await Promise.all(
          users.map(async (user: any) => {
            try {
              const preview = await billingApi.userBillingPreview(userInfo.token, user._id);
              return { ...user, ...preview.data };
            } catch {
              return user;
            }
          }),
        );
        setUserHits(previews);
      } catch {
        setUserHits([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [grantSearch, userInfo?.token]);

  const toggleSort = (current: string, setter: (value: string) => void, key: string) => {
    if (current.replace(/^-/, '') === key) {
      setter(current.startsWith('-') ? key : `-${key}`);
    } else {
      setter(`-${key}`);
    }
  };

  const act = async () => {
    if (!confirm) return;
    try {
      await billingApi.subscriptionAction(userInfo?.token, confirm.id, { action: confirm.action });
      toast({ message: t('Subscription updated'), variant: 'success' });
      setConfirm(null);
      load(true);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error updating subscription'), variant: 'destructive' });
    }
  };

  const openSub = async (row: any) => {
    try {
      const res = await billingApi.subscription(userInfo?.token, row._id);
      setDetail(res.data);
    } catch {
      setDetail({ subscription: row, payments: [] });
    }
  };

  const exportFile = async (kind: 'subs' | 'pays', fmt: 'csv' | 'xlsx') => {
    try {
      const params = { ...(kind === 'subs' ? subParams : payParams), format: fmt, skip: undefined, limit: undefined };
      const res = kind === 'subs'
        ? await billingApi.exportSubscriptions(userInfo?.token, params)
        : await billingApi.exportPayments(userInfo?.token, params);
      const ok = await downloadBillingExport(
        res.data,
        `${kind === 'subs' ? 'subscriptions' : 'payments'}.${fmt === 'xlsx' ? 'xls' : 'csv'}`,
        fmt === 'xlsx' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8',
      );
      toast({
        message: ok ? t('Export ready') : t('Export is available on web'),
        variant: ok ? 'success' : 'destructive',
      });
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Export failed'), variant: 'destructive' });
    }
  };

  const doGrant = async () => {
    if (!selectedUser?._id || !grantPlan) {
      toast({ message: t('Select a user and a plan'), variant: 'destructive' });
      return;
    }
    try {
      setGranting(true);
      await billingApi.grant(userInfo?.token, {
        user_id: selectedUser._id,
        type: 'plan',
        resource_id: grantPlan,
        duration_days: durationDays ? Number(durationDays) : undefined,
        expires_at: expiresAt || undefined,
        reason,
        notes,
      });
      toast({ message: t('Access granted'), variant: 'success' });
      setReason('');
      setNotes('');
      setDurationDays('');
      setExpiresAt('');
      load(true);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error granting access'), variant: 'destructive' });
    } finally {
      setGranting(false);
    }
  };

  if (!isAdmin) return null;

  const cards = [
    { label: t('Active subscriptions'), value: summary.active_subscriptions ?? '—' },
    { label: t('Trialing'), value: summary.trialing_subscriptions ?? '—' },
    { label: t('Expired'), value: summary.expired_subscriptions ?? '—' },
    { label: t('Monthly recurring revenue (MRR)'), value: formatPlanPrice(Number(summary.mrr) || 0) },
    { label: t('Annual recurring revenue (ARR)'), value: formatPlanPrice(Number(summary.arr) || 0) },
    { label: t('Payments confirmed today'), value: summary.payments_confirmed_today ?? '—' },
    { label: t('Failed payments today'), value: summary.payments_failed_today ?? '—' },
    { label: `${t('Conversion rate')}: ${summary.conversion_rate ?? 0}%` , value: `${summary.churn_rate ?? 0}% ${t('Cancellation rate')}` },
  ];

  const subColumns: AdminColumn<any>[] = [
    { key: 'user_name', label: t('User'), sortable: true, render: (row) => <AdminUserCell user={row.user} userId={row.user_id} /> },
    { key: 'plan_name', label: t('Plan'), sortable: true, render: (row) => <Text>{row.plan?.name || row.plan_id}</Text> },
    { key: 'status', label: t('Status'), sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'started_at', label: t('Started'), sortable: true, render: (row) => <Text>{fmt(row.started_at || row.created_at)}</Text> },
    {
      key: 'current_period_end',
      label: t('Expiration date'),
      sortable: true,
      render: (row) => (
        <View>
          <Text>{fmt(row.current_period_end || row.next_due_date)}</Text>
          <Text className="text-xs" style={{ color: colors.gray[500] }}>
            {row.days_remaining == null
              ? ''
              : row.days_remaining >= 0
                ? t('{{count}} days left', { count: row.days_remaining })
                : t('Expired')}
          </Text>
        </View>
      ),
    },
    { key: 'value', label: t('price'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.value) || 0)}</Text> },
    { key: 'payment_method', label: t('Payment method'), render: (row) => <Text>{row.payment_method || '—'}</Text> },
    { key: 'provider', label: t('Gateway'), sortable: true, render: (row) => <Text>{row.provider}</Text> },
    {
      key: 'actions',
      label: t('Actions'),
      render: (row) => (
        <View className="flex-row flex-wrap">
          <Pressable onPress={() => openSub(row)} accessibilityRole="button" accessibilityLabel={t('Details')} style={{ minHeight: 44, justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ color: colors.primary[600] }}>{t('Details')}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm({ id: row._id, action: 'cancel' })} accessibilityRole="button" accessibilityLabel={t('Cancel')} style={{ minHeight: 44, justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ color: colors.error[700] }}>{t('Cancel')}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm({ id: row._id, action: 'suspend' })} accessibilityRole="button" accessibilityLabel={t('Suspend')} style={{ minHeight: 44, justifyContent: 'center', marginRight: 8 }}>
            <Text>{t('Suspend')}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm({ id: row._id, action: 'reactivate' })} accessibilityRole="button" accessibilityLabel={t('Reactivate')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.success[700] }}>{t('Reactivate')}</Text>
          </Pressable>
        </View>
      ),
    },
  ];

  const payColumns: AdminColumn<any>[] = [
    { key: 'user_name', label: t('User'), render: (row) => <AdminUserCell user={row.user} userId={row.user_id} /> },
    { key: 'product_name', label: t('Plan'), render: (row) => <Text>{row.product_name || row.plan?.name || row.product_type}</Text> },
    { key: 'amount', label: t('price'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.amount) || 0)}</Text> },
    { key: 'status', label: t('Status'), sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: t('Purchase date'), sortable: true, render: (row) => <Text>{fmt(row.created_at)}</Text> },
    { key: 'payment_method', label: t('Payment method'), render: (row) => <Text>{row.payment_method || '—'}</Text> },
    { key: 'provider', label: t('Gateway'), render: (row) => <Text>{row.provider}</Text> },
    {
      key: 'failure_reason',
      label: t('Failure reason'),
      render: (row) => <Text>{row.failure_reason ? t(FAILURE_KEYS[row.failure_reason] || row.failure_reason) : '—'}</Text>,
    },
  ];

  return (
    <ScrollView className="flex-1 w-full px-4 md:w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 96 }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Back')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500], marginLeft: 6 }}>{t('Back')}</Text>
      </Pressable>
      <Text className="text-2xl font-bold mb-4">{t('Purchases and subscriptions')}</Text>

      <View className="flex-row flex-wrap mb-6">
        {cards.map((card) => (
          <View key={card.label} className="bg-white rounded-xl p-4 mr-3 mb-3" style={{ minWidth: 180, flexGrow: 1, maxWidth: 280 }}>
            <Text className="text-xs mb-1" style={{ color: colors.gray[500] }}>{card.label}</Text>
            <Text className="text-xl font-bold" style={{ color: colors.gray[900] }}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xl font-bold">{t('Subscriptions')}</Text>
        <AdminExportButtons onCsv={() => exportFile('subs', 'csv')} onXlsx={() => exportFile('subs', 'xlsx')} />
      </View>
      <TextInput
        className="border border-gray-200 rounded-lg px-3 py-2 mb-2 bg-white"
        placeholder={t('Search by name or email')}
        value={q}
        onChangeText={setQ}
        style={{ minHeight: 44 }}
      />
      <View className="flex-row flex-wrap mb-2">
        <Chip label={t('All statuses')} active={!status && !statusGroup} onPress={() => { setStatus(''); setStatusGroup(''); }} />
        <Chip label={t('Active')} active={statusGroup === 'active'} onPress={() => { setStatus(''); setStatusGroup('active'); }} />
        <Chip label={t('Canceled')} active={statusGroup === 'canceled'} onPress={() => { setStatus(''); setStatusGroup('canceled'); }} />
        <Chip label={t('Expired')} active={statusGroup === 'expired'} onPress={() => { setStatus(''); setStatusGroup('expired'); }} />
        {STATUSES.filter(Boolean).map((item) => (
          <Chip key={item} label={t(item === 'trialing' ? 'Trialing' : item[0].toUpperCase() + item.slice(1))} active={status === item} onPress={() => { setStatus(item); setStatusGroup(''); }} />
        ))}
      </View>
      <View className="flex-row flex-wrap mb-2">
        <Chip label={t('All plans')} active={!planId} onPress={() => setPlanId('')} />
        {plans.map((plan) => (
          <Chip key={plan._id} label={plan.name} active={planId === plan._id} onPress={() => setPlanId(plan._id)} />
        ))}
      </View>
      <View className="flex-row flex-wrap mb-2">
        {METHODS.map((item) => (
          <Chip key={item || 'all-m'} label={item || t('Payment method')} active={method === item} onPress={() => setMethod(item)} />
        ))}
        <Chip label={t('Expiring in 7 days')} active={expiring === '7'} onPress={() => setExpiring(expiring === '7' ? '' : '7')} />
        <Chip label={t('Expiring in 15 days')} active={expiring === '15'} onPress={() => setExpiring(expiring === '15' ? '' : '15')} />
        <Chip label={t('Expiring in 30 days')} active={expiring === '30'} onPress={() => setExpiring(expiring === '30' ? '' : '30')} />
      </View>
      <View className="flex-row flex-wrap items-center mb-3">
        <Chip label={t('Purchase date')} active={dateField === 'created_at'} onPress={() => setDateField('created_at')} />
        <Chip label={t('Renewal date')} active={dateField === 'next_due_date'} onPress={() => setDateField('next_due_date')} />
        <Chip label={t('Expiration date')} active={dateField === 'current_period_end'} onPress={() => setDateField('current_period_end')} />
        <DateField value={dateFrom} onChange={setDateFrom} placeholder={t('Date from')} />
        <DateField value={dateTo} onChange={setDateTo} placeholder={t('Date to')} />
      </View>
      <AdminDataTable
        columns={subColumns}
        rows={subs}
        loading={loadingSubs}
        emptyLabel={t('No subscriptions found')}
        sort={subSort}
        onSort={(key) => toggleSort(subSort, setSubSort, key)}
        page={subPage}
        pageSize={PAGE_SIZE}
        total={subsTotal}
        onPageChange={setSubPage}
      />

      <View className="flex-row items-center justify-between mt-8 mb-2">
        <Text className="text-xl font-bold">{t('Purchases')}</Text>
        <AdminExportButtons onCsv={() => exportFile('pays', 'csv')} onXlsx={() => exportFile('pays', 'xlsx')} />
      </View>
      <Chip label={t('Failed payments only')} active={failedOnly} onPress={() => { setFailedOnly((prev) => !prev); setPayPage(0); }} />
      <AdminDataTable
        columns={payColumns}
        rows={pays}
        loading={loadingPays}
        emptyLabel={t('No payments found')}
        sort={paySort}
        onSort={(key) => toggleSort(paySort, setPaySort, key)}
        onRowPress={setPayDetail}
        page={payPage}
        pageSize={PAGE_SIZE}
        total={paysTotal}
        onPageChange={setPayPage}
      />

      <Text className="text-xl font-bold mt-8 mb-3">{t('Grant access manually')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Search by name or email')}
          value={grantSearch}
          onChangeText={setGrantSearch}
          style={{ minHeight: 44 }}
        />
        {userHits.map((user) => (
          <Pressable
            key={user._id}
            onPress={() => setSelectedUser(user)}
            accessibilityRole="button"
            accessibilityLabel={user.name}
            style={{ minHeight: 44, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
          >
            <AdminUserCell user={user} userId={user._id} />
            <Text className="text-xs mt-1" style={{ color: colors.gray[500] }}>
              {(user.plan?.name || t('No plan'))} · {user.status || '—'} · {user.last_payment ? formatPlanPrice(Number(user.last_payment.amount) || 0) : t('No payments found')}
            </Text>
          </Pressable>
        ))}
        {selectedUser ? (
          <View className="mt-3 p-3 rounded-lg" style={{ backgroundColor: colors.primary[50] }}>
            <Text className="font-semibold">{selectedUser.name}</Text>
            <Text style={{ color: colors.gray[600] }}>{selectedUser.email}</Text>
          </View>
        ) : null}
        <View className="flex-row flex-wrap mt-3">
          {plans.map((plan) => (
            <Chip key={`g-${plan._id}`} label={plan.name} active={grantPlan === plan._id} onPress={() => setGrantPlan(plan._id)} />
          ))}
        </View>
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Duration (days)')} keyboardType="number-pad" value={durationDays} onChangeText={setDurationDays} style={{ minHeight: 44 }} />
        <DateField value={expiresAt} onChange={setExpiresAt} placeholder={t('Expiration date')} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Reason')} value={reason} onChangeText={setReason} style={{ minHeight: 44 }} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-3" placeholder={t('Notes')} value={notes} onChangeText={setNotes} style={{ minHeight: 44 }} />
        <Pressable disabled={granting} onPress={doGrant} accessibilityRole="button" accessibilityLabel={t('Grant')} style={{ minHeight: 44, borderRadius: 10, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-white font-semibold">{t('Grant')}</Text>
        </Pressable>
      </View>

      <Text className="text-lg font-semibold mb-2">{t('Manual grants')}</Text>
      {grants.length === 0 ? (
        <Text style={{ color: colors.gray[500] }}>{t('No grants yet')}</Text>
      ) : grants.map((grant) => (
        <View key={grant._id} className="bg-white rounded-xl p-4 mb-2">
          <AdminUserCell user={grant.user} userId={grant.user_id} />
          <Text className="mt-1">{grant.plan?.name || grant.type} · {grant.reason || grant.notes || '—'}</Text>
          <Text className="text-xs" style={{ color: colors.gray[500] }}>
            {t('Granted by')}: {grant.admin?.name || grant.granted_by} · {fmt(grant.granted_at)} · {grant.expires_at ? fmt(grant.expires_at) : t('Active')}
          </Text>
        </View>
      ))}

      <AdminConfirmModal
        open={!!confirm}
        title={confirm?.action === 'cancel' ? t('Cancel subscription') : confirm?.action === 'suspend' ? t('Suspend') : t('Reactivate')}
        message={t('Are you sure you want to continue? This action can change user access.')}
        destructive={confirm?.action !== 'reactivate'}
        onCancel={() => setConfirm(null)}
        onConfirm={act}
      />

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-4" onPress={() => setDetail(null)}>
          <Pressable className="w-full max-w-2xl bg-white rounded-2xl p-5" style={{ maxHeight: '80%' }}>
            <Text className="text-lg font-bold mb-2">{t('Subscription details')}</Text>
            {detail?.subscription ? (
              <ScrollView>
                <AdminUserCell user={detail.subscription.user} userId={detail.subscription.user_id} />
                <Text className="mt-2">{detail.subscription.plan?.name} · {detail.subscription._id}</Text>
                <StatusBadge status={detail.subscription.status} />
                <Text className="mt-2">{t('Remaining time')}: {detail.subscription.days_remaining == null ? '—' : t('{{count}} days left', { count: detail.subscription.days_remaining })}</Text>
                <Text className="font-semibold mt-3 mb-1">{t('Linked payments')}</Text>
                {(detail.payments || []).map((pay: any) => (
                  <Text key={pay._id} className="mb-1">{fmt(pay.created_at)} · {formatPlanPrice(Number(pay.amount) || 0)} · {pay.status}</Text>
                ))}
              </ScrollView>
            ) : null}
            <Pressable onPress={() => setDetail(null)} accessibilityRole="button" accessibilityLabel={t('Close')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.primary[600] }}>{t('Close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!payDetail} transparent animationType="fade" onRequestClose={() => setPayDetail(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-4" onPress={() => setPayDetail(null)}>
          <Pressable className="w-full max-w-lg bg-white rounded-2xl p-5">
            <Text className="text-lg font-bold mb-2">{t('Payment details')}</Text>
            {payDetail ? (
              <>
                <AdminUserCell user={payDetail.user} userId={payDetail.user_id} />
                <StatusBadge status={payDetail.status} />
                <Text className="mt-2">{formatPlanPrice(Number(payDetail.amount) || 0)} · {payDetail.payment_method} · {payDetail.provider}</Text>
                <Text>{t('Failure reason')}: {payDetail.failure_reason ? t(FAILURE_KEYS[payDetail.failure_reason] || payDetail.failure_reason) : '—'}</Text>
                <Text>{t('Failure code')}: {payDetail.failure_code || '—'}</Text>
                <Text>{t('Attempts')}: {payDetail.attempt_count || 0}</Text>
                <Text>{t('Next attempt')}: {payDetail.next_attempt_at ? fmt(payDetail.next_attempt_at) : '—'}</Text>
              </>
            ) : null}
            <Pressable onPress={() => setPayDetail(null)} accessibilityRole="button" accessibilityLabel={t('Close')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.primary[600] }}>{t('Close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
