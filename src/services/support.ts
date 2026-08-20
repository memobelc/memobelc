import api from '@/services/api';

function auth(token?: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'closed';
export type SupportAuthorRole = 'user' | 'admin';

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
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_name?: string | null;
  user_email?: string | null;
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
};

export const supportApi = {
  getConversation: (token?: string, since?: string) =>
    api.get<SupportConversation>('/support/conversation', {
      ...auth(token),
      params: since ? { since } : undefined,
    }),
  getMessages: (token?: string, since?: string) =>
    api.get<SupportConversation>('/support/messages', {
      ...auth(token),
      params: since ? { since } : undefined,
    }),
  sendMessage: (token: string | undefined, body: string) =>
    api.post<{ ticket: SupportTicket; message: SupportMessage }>(
      '/support/messages',
      { body },
      auth(token),
    ),
  markRead: (token?: string) =>
    api.post<{ ticket: SupportTicket | null; modified: number }>(
      '/support/messages/read',
      {},
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
  adminClose: (token: string | undefined, ticketId: string) =>
    api.patch<{ ticket: SupportTicket }>(
      `/admin/support/tickets/${ticketId}/close`,
      {},
      auth(token),
    ),
  adminReopen: (token: string | undefined, ticketId: string) =>
    api.patch<{ ticket: SupportTicket }>(
      `/admin/support/tickets/${ticketId}/reopen`,
      {},
      auth(token),
    ),
};
