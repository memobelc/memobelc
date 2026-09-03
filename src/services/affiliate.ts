import api from '@/services/api';

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export type CommissionTier = {
  min_sales: number;
  max_sales?: number | null;
  percent: number;
};

export type AffiliateWallet = {
  pending: number;
  available: number;
  withdrawn: number;
  credited?: number;
};

export type AffiliateProfile = {
  _id: string;
  user_id: string;
  status: 'active' | 'suspended';
  referral_code: string;
  user_name?: string | null;
  user_email?: string | null;
  wallet: AffiliateWallet;
  sales_count?: number;
};

export type AffiliateApplication = {
  _id: string;
  affiliate_id: string;
  user_id: string;
  product_id: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  user_name?: string | null;
  user_email?: string | null;
  product_name?: string | null;
  created_at?: string;
};

export type AffiliateProduct = {
  _id: string;
  name: string;
  slug: string;
  image?: string | null;
  description?: string;
  rules?: string;
  terms?: string;
  source: 'platform' | 'external';
  product_type?: string | null;
  product_id?: string | null;
  checkout_url?: string | null;
  affiliate_enabled?: boolean;
  show_in_catalog?: boolean;
  is_active?: boolean;
  commission_tiers?: CommissionTier[];
  application?: AffiliateApplication | null;
  current_percent?: number;
  sale_count?: number;
  share_url?: string | null;
  referral_code?: string | null;
  coupon_code?: string | null;
};

export type AffiliateCommission = {
  _id: string;
  affiliate_id: string;
  product_id: string;
  sale_amount: number;
  percent: number;
  amount: number;
  status: 'pending' | 'available' | 'cancelled';
  sale_count_at?: number;
  product_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at?: string;
};

export type AffiliateWithdrawal = {
  _id: string;
  amount: number;
  pix_key: string;
  full_name: string;
  cpf: string;
  bank?: string | null;
  status: 'processing' | 'paid' | 'rejected';
  user_name?: string | null;
  user_email?: string | null;
  requested_at?: string;
  notes?: string;
};

export type AffiliateSettings = {
  min_withdrawal_amount: number;
  withdrawals_enabled: boolean;
  pix_required: boolean;
};

export const affiliateApi = {
  me: (token?: string) => api.get<AffiliateProfile>('/affiliate/me', auth(token)),
  products: (token?: string) =>
    api.get<{ resellable: AffiliateProduct[]; available: AffiliateProduct[] }>(
      '/affiliate/products',
      auth(token),
    ),
  product: (token: string | undefined, id: string) =>
    api.get<AffiliateProduct>(`/affiliate/products/${id}`, auth(token)),
  apply: (token: string | undefined, id: string) =>
    api.post(`/affiliate/products/${id}/apply`, { accepted_terms: true }, auth(token)),
  sales: (token?: string) =>
    api.get<{ sales: AffiliateCommission[] }>('/affiliate/sales', auth(token)),
  wallet: (token?: string) =>
    api.get<AffiliateProfile & { commissions: AffiliateCommission[]; withdrawals: AffiliateWithdrawal[]; settings: AffiliateSettings }>(
      '/affiliate/wallet',
      auth(token),
    ),
  withdrawals: (token?: string) =>
    api.get<{ withdrawals: AffiliateWithdrawal[] }>('/affiliate/withdrawals', auth(token)),
  requestWithdrawal: (
    token: string | undefined,
    data: { amount: number; pix_key: string; full_name: string; cpf: string; bank?: string },
  ) => api.post('/affiliate/withdrawals', data, auth(token)),
};

export const adminAffiliateApi = {
  list: (token?: string, status?: string) =>
    api.get<{ affiliates: AffiliateProfile[] }>('/admin/affiliates', {
      ...auth(token),
      params: status ? { status } : undefined,
    }),
  add: (token: string | undefined, userId: string) =>
    api.post('/admin/affiliates', { user_id: userId }, auth(token)),
  update: (token: string | undefined, id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/affiliates/${id}`, data, auth(token)),
  products: (token?: string) =>
    api.get<{ products: AffiliateProduct[] }>('/admin/affiliates/products', auth(token)),
  createProduct: (token: string | undefined, data: Record<string, unknown>) =>
    api.post('/admin/affiliates/products', data, auth(token)),
  updateProduct: (token: string | undefined, id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/affiliates/products/${id}`, data, auth(token)),
  settings: (token?: string) =>
    api.get<AffiliateSettings>('/admin/affiliates/settings', auth(token)),
  updateSettings: (token: string | undefined, data: Record<string, unknown>) =>
    api.patch('/admin/affiliates/settings', data, auth(token)),
  applications: (token?: string, status?: string) =>
    api.get<{ applications: AffiliateApplication[] }>('/admin/affiliates/applications', {
      ...auth(token),
      params: status ? { status } : undefined,
    }),
  reviewApplication: (token: string | undefined, id: string, status: string, notes?: string) =>
    api.patch(`/admin/affiliates/applications/${id}`, { status, notes }, auth(token)),
  commissions: (token?: string, status?: string) =>
    api.get<{ commissions: AffiliateCommission[] }>('/admin/affiliates/commissions', {
      ...auth(token),
      params: status ? { status } : undefined,
    }),
  reviewCommission: (token: string | undefined, id: string, status: string, notes?: string) =>
    api.patch(`/admin/affiliates/commissions/${id}`, { status, notes }, auth(token)),
  withdrawals: (token?: string, status?: string) =>
    api.get<{ withdrawals: AffiliateWithdrawal[] }>('/admin/affiliates/withdrawals', {
      ...auth(token),
      params: status ? { status } : undefined,
    }),
  reviewWithdrawal: (token: string | undefined, id: string, status: string, notes?: string) =>
    api.patch(`/admin/affiliates/withdrawals/${id}`, { status, notes }, auth(token)),
  registerSale: (token: string | undefined, data: Record<string, unknown>) =>
    api.post('/admin/affiliates/sales', data, auth(token)),
};

export function formatMoney(value?: number | null) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}
