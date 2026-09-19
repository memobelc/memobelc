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

export type NotificationTargetType = 'all' | 'users' | 'roles' | 'classroom' | 'group';

export type NotificationAudienceRole = 'user' | 'teacher' | 'admin' | 'affiliate';

export type NotificationGroupMember = {
  _id: string;
  name?: string;
  email?: string;
};

export type NotificationGroup = {
  _id: string;
  name: string;
  description?: string;
  user_ids: string[];
  members?: NotificationGroupMember[];
  member_count?: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminNotificationTarget = {
  target_type?: NotificationTargetType;
  user_ids?: string[];
  roles?: NotificationAudienceRole[];
  classroom_id?: string;
  group_id?: string;
};

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export type AdminSentNotification = {
  batch_id: string;
  title: string;
  body: string;
  target_type?: NotificationTargetType | string | null;
  sent_to: number;
  created_at?: string | null;
  from_admin_id?: string | null;
  legacy?: boolean;
};

export const notificationsApi = {
  getSettings: (token?: string) =>
    api.get<NotificationSettings>('/notifications/settings', auth(token)),
  updateSettings: (
    token: string | undefined,
    data: { services: Partial<Record<NotificationServiceKey, Partial<ServicePreference>>> },
  ) => api.patch<NotificationSettings>('/notifications/settings', data, auth(token)),
  sendTeacherCustom: (
    token: string | undefined,
    data: { classroom_id: string; title: string; body: string; student_ids?: string[] },
  ) =>
    api.post<{ sent_to: number }>('/notifications/teacher/custom', data, auth(token)),
  sendAdminCustom: (
    token: string | undefined,
    data: { title: string; body: string } & AdminNotificationTarget,
  ) =>
    api.post<{ sent_to: number; batch_id?: string }>(
      '/notifications/admin/custom',
      data,
      auth(token),
    ),
  previewAdmin: (token: string | undefined, data: AdminNotificationTarget) =>
    api.post<{ count: number }>('/notifications/admin/preview', data, auth(token)),
  listGroups: (token?: string) =>
    api.get<{ groups: NotificationGroup[] }>('/notifications/admin/groups', auth(token)),
  createGroup: (
    token: string | undefined,
    data: { name: string; description?: string; user_ids?: string[] },
  ) => api.post<NotificationGroup>('/notifications/admin/groups', data, auth(token)),
  updateGroup: (
    token: string | undefined,
    groupId: string,
    data: { name?: string; description?: string; user_ids?: string[] },
  ) => api.patch<NotificationGroup>(`/notifications/admin/groups/${groupId}`, data, auth(token)),
  deleteGroup: (token: string | undefined, groupId: string) =>
    api.delete<{ deleted: boolean }>(`/notifications/admin/groups/${groupId}`, auth(token)),
  listSent: (token?: string) =>
    api.get<{ notifications: AdminSentNotification[] }>('/notifications/admin/sent', auth(token)),
  deleteSent: (token: string | undefined, batchId: string) =>
    api.delete<{ deleted: boolean; count?: number }>(
      `/notifications/admin/sent/${encodeURIComponent(batchId)}`,
      auth(token),
    ),
};
