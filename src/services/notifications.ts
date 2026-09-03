import api from '@/services/api';

export type NotificationServiceKey =
  | 'daily_study'
  | 'classroom_added'
  | 'new_cards'
  | 'teacher_custom'
  | 'admin_custom'
  | 'support'
  | 'affiliate'
  | 'affiliate_sales';

export type ServicePreference = {
  enabled: boolean;
  email: boolean;
};

export type NotificationSettings = {
  user_id?: string;
  services: Record<NotificationServiceKey, ServicePreference>;
  updated_at?: string | null;
};

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const notificationsApi = {
  getSettings: (token?: string) =>
    api.get<NotificationSettings>('/notifications/settings', auth(token)),
  updateSettings: (token: string | undefined, data: { services: Partial<Record<NotificationServiceKey, Partial<ServicePreference>>> }) =>
    api.patch<NotificationSettings>('/notifications/settings', data, auth(token)),
};
