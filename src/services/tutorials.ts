import api from '@/services/api';

export type TutorialAudienceType =
  | 'all'
  | 'new_users'
  | 'premium'
  | 'free'
  | 'specific_users'
  | 'roles';

export type TutorialStatus = 'draft' | 'active' | 'inactive' | 'archived';

export type TutorialPlacement = 'bottom' | 'top' | 'left' | 'right' | 'center';

export type TutorialSection =
  | 'home'
  | 'books'
  | 'videos'
  | 'collections'
  | 'talk_to_me'
  | 'classrooms'
  | 'courses'
  | 'plans';

export type TutorialInteraction = 'next' | 'tap';

export type TutorialTargetKey = string;

export type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BrainExpression =
  | 'happy'
  | 'excited'
  | 'explaining'
  | 'thinking'
  | 'celebrating'
  | 'proud'
  | 'motivating'
  | 'curious'
  | 'tip'
  | 'studying'
  | 'pointing'
  | 'news'
  | 'worried'
  | 'sad'
  | 'confused'
  | 'surprised'
  | 'sleeping'
  | 'achievement'
  | 'premium'
  | 'teacher'
  | 'mentor';

export type I18nMap = Partial<Record<string, string>> | string;

export type TutorialStep = {
  id: string;
  order: number;
  title: string;
  body: string;
  tip?: string;
  title_i18n?: I18nMap;
  body_i18n?: I18nMap;
  tip_i18n?: I18nMap;
  icon?: string;
  brain_expression?: BrainExpression;
  target_key?: TutorialTargetKey | null;
  highlight_rect?: HighlightRect | null;
  tooltip_placement?: TutorialPlacement;
  image_url?: string | null;
  video_url?: string | null;
  required_highlight?: boolean;
  interaction?: TutorialInteraction;
  tap_label?: string;
  tap_label_i18n?: I18nMap;
};

export type TutorialAudience = {
  type: TutorialAudienceType;
  user_ids?: string[];
  roles?: string[];
  new_user_days?: number;
};

export type TutorialProgress = {
  viewed?: boolean;
  completed?: boolean;
  skipped?: boolean;
  current_step?: number;
  last_viewed_at?: string | null;
  completed_at?: string | null;
  skipped_at?: string | null;
  time_spent_ms?: number;
  tutorial_id?: string;
  tutorial_key?: string;
  version?: number;
  name?: string;
};

export type Tutorial = {
  _id: string;
  key: string;
  version: number;
  status: TutorialStatus;
  name: string | I18nMap;
  description: string | I18nMap;
  name_i18n?: I18nMap;
  description_i18n?: I18nMap;
  audience: TutorialAudience;
  section?: TutorialSection;
  steps: TutorialStep[];
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  progress?: TutorialProgress | null;
  users_impacted?: number;
  completion_rate?: number;
  skip_rate?: number;
  abandon_rate?: number;
};

export type TutorialAnalytics = {
  tutorial: Tutorial;
  views: number;
  users_impacted: number;
  completed: number;
  skipped: number;
  abandoned: number;
  completion_rate: number;
  skip_rate: number;
  abandon_rate: number;
  avg_time_ms: number;
  skip_clicks: number;
  replay_clicks: number;
  step_dropoff: {
    step_id: string;
    order: number;
    title: string;
    reached: number;
    skipped_here: number;
  }[];
  highest_abandon_step?: { title: string; skipped_here: number } | null;
};

export type BrainAvatar = {
  _id: string;
  key: string;
  name: string;
  image?: string | null;
  image_dark?: string | null;
  builtin_asset?: string | null;
  events?: string[];
  is_active?: boolean;
};

const auth = (token?: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const tutorialsApi = {
  me: (token: string, locale?: string, section?: string) =>
    api.get<{ tutorial: Tutorial | null }>('/tutorials/me', {
      ...auth(token),
      params: {
        ...(locale ? { locale } : {}),
        ...(section ? { section } : {}),
      },
    }),
  catalog: (token: string, locale?: string) =>
    api.get<{ tutorials: Tutorial[] }>('/tutorials/catalog', {
      ...auth(token),
      params: locale ? { locale } : undefined,
    }),
  history: (token: string, locale?: string) =>
    api.get<{ history: TutorialProgress[] }>('/tutorials/me/history', {
      ...auth(token),
      params: locale ? { locale } : undefined,
    }),
  event: (
    token: string,
    tutorialId: string,
    data: { type: string; step_index?: number; duration_ms?: number },
  ) => api.post(`/tutorials/${tutorialId}/events`, data, auth(token)),
  complete: (token: string, tutorialId: string, duration_ms?: number) =>
    api.post(`/tutorials/${tutorialId}/complete`, { duration_ms }, auth(token)),
  skip: (token: string, tutorialId: string, data?: { step_index?: number; duration_ms?: number }) =>
    api.post(`/tutorials/${tutorialId}/skip`, data || {}, auth(token)),
  replay: (token: string, tutorialId: string, locale?: string) =>
    api.post<{ tutorial: Tutorial }>(
      `/tutorials/${tutorialId}/replay`,
      {},
      { ...auth(token), params: locale ? { locale } : undefined },
    ),
};

export const adminTutorialsApi = {
  list: (token: string, status?: string) =>
    api.get<{ tutorials: Tutorial[] }>('/admin/tutorials', {
      ...auth(token),
      params: status ? { status } : undefined,
    }),
  get: (token: string, id: string) => api.get<Tutorial>(`/admin/tutorials/${id}`, auth(token)),
  create: (token: string, data: Partial<Tutorial>) =>
    api.post<Tutorial>('/admin/tutorials', data, auth(token)),
  update: (token: string, id: string, data: Partial<Tutorial>) =>
    api.patch<Tutorial>(`/admin/tutorials/${id}`, data, auth(token)),
  duplicate: (token: string, id: string, newVersion?: boolean) =>
    api.post<Tutorial>(`/admin/tutorials/${id}/duplicate`, { new_version: !!newVersion }, auth(token)),
  publish: (token: string, id: string) =>
    api.post<Tutorial>(`/admin/tutorials/${id}/publish`, {}, auth(token)),
  deactivate: (token: string, id: string) =>
    api.post<Tutorial>(`/admin/tutorials/${id}/deactivate`, {}, auth(token)),
  analytics: (token: string, id: string) =>
    api.get<TutorialAnalytics>(`/admin/tutorials/${id}/analytics`, auth(token)),
  listAvatars: (token: string) =>
    api.get<{ avatars: BrainAvatar[] }>('/admin/tutorials/brain-avatars', auth(token)),
  createAvatar: (token: string, data: Partial<BrainAvatar>) =>
    api.post<BrainAvatar>('/admin/tutorials/brain-avatars', data, auth(token)),
  updateAvatar: (token: string, id: string, data: Partial<BrainAvatar>) =>
    api.patch<BrainAvatar>(`/admin/tutorials/brain-avatars/${id}`, data, auth(token)),
};
