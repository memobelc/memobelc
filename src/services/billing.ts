import { Platform } from 'react-native';
import api from '@/services/api';

export type BillingPlatform = 'web' | 'android' | 'ios';

export function billingPlatform(): BillingPlatform {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
}

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const billingApi = {
  entitlements: (token?: string) => api.get('/entitlements/me', auth(token)),
  me: (token?: string) => api.get('/billing/me', auth(token)),
  payments: (token?: string) => api.get('/billing/payments', auth(token)),
  syncPayment: (token: string | undefined, paymentId: string) =>
    api.post(`/billing/payments/${paymentId}/sync`, {}, auth(token)),
  publicPlans: () => api.get('/plans/public'),
  checkout: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/billing/checkout', payload, auth(token)),
  publicCheckout: (payload: Record<string, unknown>) =>
    api.post('/billing/public/checkout', payload),
  publicSyncPayment: (paymentId: string, payload: Record<string, unknown>) =>
    api.post(`/billing/public/payments/${paymentId}/sync`, payload),
  publicPixQr: (paymentId: string, payload: Record<string, unknown>) =>
    api.post(`/billing/public/payments/${paymentId}/pix`, payload),
  cancel: (token?: string) => api.post('/billing/cancel', {}, auth(token)),
  changePlan: (token: string | undefined, planId: string) =>
    api.post('/billing/change-plan', { plan_id: planId }, auth(token)),
  updatePayment: (token: string | undefined, payload?: Record<string, unknown>) =>
    api.post('/billing/update-payment', payload || {}, auth(token)),
  pixQr: (token: string | undefined, paymentId: string) =>
    api.get(`/billing/payments/${paymentId}/pix`, auth(token)),
  validateCoupon: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/coupons/validate', payload, auth(token)),
  googleVerify: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/billing/google/verify', payload, auth(token)),
  adminPlans: (token?: string) => api.get('/plans/admin', auth(token)),
  createPlan: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/plans/admin', payload, auth(token)),
  updatePlan: (token: string | undefined, id: string, payload: Record<string, unknown>) =>
    api.put(`/plans/admin/${id}`, payload, auth(token)),
  deletePlan: (token: string | undefined, id: string) =>
    api.delete(`/plans/admin/${id}`, auth(token)),
  adminCoupons: (token?: string) => api.get('/coupons/admin', auth(token)),
  createCoupon: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/coupons/admin', payload, auth(token)),
  updateCoupon: (token: string | undefined, id: string, payload: Record<string, unknown>) =>
    api.put(`/coupons/admin/${id}`, payload, auth(token)),
  couponRedemptions: (token: string | undefined, id: string) =>
    api.get(`/coupons/admin/${id}/redemptions`, auth(token)),
  adminBundles: (token?: string) => api.get('/bundles/admin', auth(token)),
  publicBundles: (token?: string) => api.get('/bundles/public', auth(token)),
  publicBundle: (id: string) => api.get(`/bundles/public/${id}`),
  createBundle: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/bundles/admin', payload, auth(token)),
  updateBundle: (token: string | undefined, id: string, payload: Record<string, unknown>) =>
    api.put(`/bundles/admin/${id}`, payload, auth(token)),
  deleteBundle: (token: string | undefined, id: string) =>
    api.delete(`/bundles/admin/${id}`, auth(token)),
  subscriptions: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/subscriptions', { ...auth(token), params }),
  subscription: (token: string | undefined, id: string) =>
    api.get(`/admin/billing/subscriptions/${id}`, auth(token)),
  paymentsAdmin: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/payments', { ...auth(token), params }),
  billingSummary: (token?: string) =>
    api.get('/admin/billing/summary', auth(token)),
  listGrants: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/grants', { ...auth(token), params }),
  userBillingPreview: (token: string | undefined, userId: string) =>
    api.get(`/admin/billing/users/${userId}/preview`, auth(token)),
  planInsights: (token: string | undefined, id: string) =>
    api.get(`/plans/admin/${id}/insights`, auth(token)),
  exportSubscriptions: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/subscriptions/export', { ...auth(token), params, responseType: 'arraybuffer' }),
  exportPayments: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/payments/export', { ...auth(token), params, responseType: 'arraybuffer' }),
  subscriptionAction: (token: string | undefined, id: string, payload: Record<string, unknown>) =>
    api.post(`/admin/billing/subscriptions/${id}/action`, payload, auth(token)),
  grant: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/admin/billing/grants', payload, auth(token)),
  revoke: (token: string | undefined, id: string) =>
    api.delete(`/admin/billing/grants/${id}`, auth(token)),
  userEntitlements: (token: string | undefined, userId: string) =>
    api.get(`/admin/billing/users/${userId}/entitlements`, auth(token)),
  accessRules: (token?: string) => api.get('/admin/billing/access', auth(token)),
  updateAccess: (token: string | undefined, key: string, payload: Record<string, unknown>) =>
    api.put(`/admin/billing/access/${key}`, payload, auth(token)),
  externalSales: (token?: string) => api.get('/admin/billing/external-sales', auth(token)),
  createExternalSale: (token: string | undefined, payload: Record<string, unknown>) =>
    api.post('/admin/billing/external-sales', payload, auth(token)),
  adminClassrooms: (token?: string) =>
    api.get('/admin/billing/classrooms', auth(token)),
  updateClassroomCheckout: (token: string | undefined, id: string, payload: Record<string, unknown>) =>
    api.put(`/admin/billing/classrooms/${id}`, payload, auth(token)),
  classroomCheckouts: (token: string | undefined, params?: Record<string, unknown>) =>
    api.get('/admin/billing/classroom-checkouts', { ...auth(token), params }),
  adminUsers: (token?: string, search?: string) =>
    api.get('/admin/users', { ...auth(token), params: search ? { search } : undefined }),
  adminBooks: (token?: string) => api.get('/books/admin/list', auth(token)),
};

export async function downloadBillingExport(buffer: ArrayBuffer, filename: string, mime: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
    const blob = new Blob([buffer], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  }
  return false;
}
