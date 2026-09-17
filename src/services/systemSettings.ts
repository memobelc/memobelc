import api from '@/services/api';

export type SystemSetting = {
  key: string;
  value: string;
  is_sensitive: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type SystemSettingsHistoryItem = {
  _id: string;
  key: string;
  old_value?: string | null;
  new_value?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const systemSettingsApi = {
  list: (token?: string) =>
    api.get<{ settings: SystemSetting[] }>('/admin/settings', auth(token)),
  update: (token: string | undefined, settings: Record<string, string>) =>
    api.patch<{ settings: SystemSetting[] }>('/admin/settings', { settings }, auth(token)),
  history: (token?: string) =>
    api.get<{ history: SystemSettingsHistoryItem[]; total: number }>(
      '/admin/settings/history',
      auth(token),
    ),
};
