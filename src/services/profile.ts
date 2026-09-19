import api from '@/services/api';

export type UserAddress = {
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const emptyAddress = (): UserAddress => ({
  postal_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
});

export type ProfileBadge = {
  _id: string;
  name: string;
  description?: string;
  image?: string | null;
  animation?: string;
  is_active?: boolean;
  awarded_at?: string | null;
  earners_count?: number;
};

export type ProfileMission = {
  _id: string;
  title: string;
  description?: string;
  image?: string | null;
  coins: number;
  is_active?: boolean;
  type?: 'manual' | 'streak';
  required_streak?: number | null;
  current_streak?: number;
  status?: 'pending' | 'completed';
  completed_at?: string | null;
  coins_awarded?: number | null;
  completers_count?: number;
};

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  cpf_cnpj?: string | null;
  address: UserAddress;
  coins: number;
  role?: string;
  roles?: string[];
  badges: ProfileBadge[];
  missions: ProfileMission[];
};

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const profileApi = {
  me: (token?: string) => api.get<UserProfile>('/profile/me', auth(token)),
  updateMe: (
    token: string | undefined,
    data: {
      name?: string;
      image?: string | null;
      cpf_cnpj?: string | null;
      address?: UserAddress;
    },
  ) => api.patch<UserProfile>('/profile/me', data, auth(token)),
  completeMission: (token: string | undefined, missionId: string) =>
    api.post(`/missions/${missionId}/complete`, {}, auth(token)),
};

export const adminProfileApi = {
  badges: (token?: string) => api.get('/admin/badges', auth(token)),
  createBadge: (token: string | undefined, data: Record<string, unknown>) =>
    api.post('/admin/badges', data, auth(token)),
  updateBadge: (token: string | undefined, id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/badges/${id}`, data, auth(token)),
  badgeUsers: (token: string | undefined, id: string) =>
    api.get(`/admin/badges/${id}/users`, auth(token)),
  awardBadge: (token: string | undefined, userId: string, badgeId: string) =>
    api.post(`/admin/users/${userId}/badges`, { badge_id: badgeId }, auth(token)),
  deleteBadge: (token: string | undefined, id: string) =>
    api.delete(`/admin/badges/${id}`, auth(token)),
  updateUser: (
    token: string | undefined,
    userId: string,
    data: {
      name?: string;
      email?: string;
      image?: string | null;
      cpf_cnpj?: string | null;
      address?: UserAddress;
    },
  ) => api.patch(`/admin/users/${userId}`, data, auth(token)),
  deleteUser: (token: string | undefined, userId: string) =>
    api.delete(`/admin/users/${userId}`, auth(token)),
  deleteUserCollection: (token: string | undefined, userId: string, collectionId: string) =>
    api.delete(`/admin/users/${userId}/collections/${collectionId}`, auth(token)),
  deleteUserDeck: (token: string | undefined, userId: string, deckId: string) =>
    api.delete(`/admin/users/${userId}/decks/${deckId}`, auth(token)),
  deleteUserCard: (token: string | undefined, userId: string, cardId: string) =>
    api.delete(`/admin/users/${userId}/cards/${cardId}`, auth(token)),
  missions: (token?: string) => api.get('/admin/missions', auth(token)),
  createMission: (token: string | undefined, data: Record<string, unknown>) =>
    api.post('/admin/missions', data, auth(token)),
  updateMission: (token: string | undefined, id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/missions/${id}`, data, auth(token)),
  missionUsers: (token: string | undefined, id: string) =>
    api.get(`/admin/missions/${id}/users`, auth(token)),
  grantCoins: (
    token: string | undefined,
    userId: string,
    amount: number,
    reason?: string,
  ) => api.post(`/admin/users/${userId}/coins`, { amount, reason }, auth(token)),
};
