import api from '@/services/api';

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'closed';
export type SupportAuthorRole = 'user' | 'admin' | 'system';

export type SupportTicket = {
  _id: string;
  user_id: string;
  status: SupportTicketStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_author_role: SupportAuthorRole | null;
  unread_for_user: number;
  unread_for_admin: number;
  closed_by: string | null;
  handled_by: string | null;
  closed_at: string | null;
  csat_required: boolean;
  csat_score: number | null;
  csat_submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_name?: string | null;
  user_email?: string | null;
  handled_by_name?: string | null;
  handled_by_email?: string | null;
};

export type SupportMessage = {
  _id: string;
  ticket_id: string;
  author_id: string;
  author_role: SupportAuthorRole;
  body: string;
  read_at: string | null;
  created_at: string | null;
};

export type SupportConversation = {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  tickets?: SupportTicket[];
};

type ConversationParams = {
  since?: string;
  ticketId?: string;
};

export type SupportCsatDistribution = Record<string, number>;

export type SupportCsatAgentMetrics = {
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  count: number;
  average: number | null;
  distribution: SupportCsatDistribution;
};

export type SupportCsatTeamMetrics = {
  count: number;
  average: number | null;
  pending: number;
  distribution: SupportCsatDistribution;
};

export type SupportCsatRecent = {
  ticket_id: string;
  score: number;
  submitted_at: string | null;
  user_name: string | null;
  admin_id: string | null;
  admin_name: string | null;
};

export type SupportCsatMetrics = {
  team: SupportCsatTeamMetrics;
  agents: SupportCsatAgentMetrics[];
  recent: SupportCsatRecent[];
};

export const supportApi = {
  listTickets: (token?: string) =>
    api.get<{ tickets: SupportTicket[]; unread_total: number }>(
      '/support/tickets',
      auth(token),
    ),
  getConversation: (token?: string, params?: ConversationParams) =>
    api.get<SupportConversation>('/support/conversation', {
      ...auth(token),
      params: {
        ...(params?.since ? { since: params.since } : {}),
        ...(params?.ticketId ? { ticket_id: params.ticketId } : {}),
      },
    }),
  getTicket: (token: string | undefined, ticketId: string, since?: string) =>
    api.get<SupportConversation>(`/support/tickets/${ticketId}`, {
      ...auth(token),
      params: since ? { since } : undefined,
    }),
  getMessages: (token?: string, params?: ConversationParams) =>
    api.get<SupportConversation>('/support/messages', {
      ...auth(token),
      params: {
        ...(params?.since ? { since: params.since } : {}),
        ...(params?.ticketId ? { ticket_id: params.ticketId } : {}),
      },
    }),
  sendMessage: (token: string | undefined, body: string, ticketId?: string) =>
    api.post<{ ticket: SupportTicket; message: SupportMessage }>(
      '/support/messages',
      { body, ticket_id: ticketId },
      auth(token),
    ),
  markRead: (token?: string, ticketId?: string) =>
    api.post<{ ticket: SupportTicket | null; modified: number }>(
      '/support/messages/read',
      ticketId ? { ticket_id: ticketId } : {},
      auth(token),
    ),
  submitCsat: (token: string | undefined, ticketId: string, score: number) =>
    api.post<{ ticket: SupportTicket }>(
      `/support/tickets/${ticketId}/csat`,
      { score },
      auth(token),
    ),
  adminListTickets: (
    token?: string,
    params?: { status?: SupportTicketStatus | ''; q?: string },
  ) =>
    api.get<{ tickets: SupportTicket[]; unread_total: number }>(
      '/admin/support/tickets',
      { ...auth(token), params },
    ),
  adminGetTicket: (token: string | undefined, ticketId: string) =>
    api.get<{ ticket: SupportTicket }>(`/admin/support/tickets/${ticketId}`, auth(token)),
  adminGetMessages: (token: string | undefined, ticketId: string, since?: string) =>
    api.get<{ ticket: SupportTicket; messages: SupportMessage[] }>(
      `/admin/support/tickets/${ticketId}/messages`,
      { ...auth(token), params: since ? { since } : undefined },
    ),
  adminSendMessage: (token: string | undefined, ticketId: string, body: string) =>
    api.post<{ ticket: SupportTicket; message: SupportMessage }>(
      `/admin/support/tickets/${ticketId}/messages`,
      { body },
      auth(token),
    ),
  adminMarkRead: (token: string | undefined, ticketId: string) =>
    api.post<{ ticket: SupportTicket; modified: number }>(
      `/admin/support/tickets/${ticketId}/messages/read`,
      {},
      auth(token),
    ),
  adminClose: (
    token: string | undefined,
    ticketId: string,
    options?: { skip_csat?: boolean },
  ) =>
    api.patch<{ ticket: SupportTicket }>(
      `/admin/support/tickets/${ticketId}/close`,
      { skip_csat: Boolean(options?.skip_csat) },
      auth(token),
    ),
  adminReopen: (token: string | undefined, ticketId: string) =>
    api.patch<{ ticket: SupportTicket }>(
      `/admin/support/tickets/${ticketId}/reopen`,
      {},
      auth(token),
    ),
  adminMetrics: (token?: string) =>
    api.get<SupportCsatMetrics>('/admin/support/metrics', auth(token)),
};
