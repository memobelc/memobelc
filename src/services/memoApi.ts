import axios from 'axios';

const MEMO_API_URL = process.env.EXPO_PUBLIC_MEMO_API_URL || 'http://localhost:8000';

const memoApi = axios.create({
  baseURL: MEMO_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Headers ─────────────────────────────────────────────────────────────────

const MAIN_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

const mainApi = axios.create({
  baseURL: MAIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const getMemoHeaders = (memoId: string, token?: string | null) => ({
  'X-Memo-ID': memoId,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const getAuthHeaders = (token?: string | null) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// ─── memo-api: document & query operations ───────────────────────────────────

export const memoApiService = {
  addText: (text: string, memoId: string, token?: string | null) =>
    memoApi
      .post('/documents/text', { text }, { headers: getMemoHeaders(memoId, token) })
      .then((r) => r.data),

  addFiles: async (
    files: { uri: string; name: string; type?: string }[],
    memoId: string,
    token?: string | null,
  ) => {
    const formData = new FormData();
    files.forEach((f) =>
      formData.append('files', { uri: f.uri, name: f.name, type: f.type || 'application/octet-stream' } as any),
    );

    const headers: Record<string, string> = { 'X-Memo-ID': memoId };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${MEMO_API_URL}/documents/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed (${response.status}): ${text}`);
    }

    return response.json();
  },

  query: (question: string, memoId: string, token?: string | null) =>
    memoApi
      .post('/query', { question }, { headers: getMemoHeaders(memoId, token) })
      .then((r) => r.data),

  getDocumentCount: (memoId: string, token?: string | null) =>
    memoApi
      .get('/documents/count', { headers: getMemoHeaders(memoId, token) })
      .then((r) => r.data),

  clearDocuments: (memoId: string, token?: string | null) =>
    memoApi
      .delete('/documents', { headers: getMemoHeaders(memoId, token) })
      .then((r) => r.data),
};

// ─── memobelc-api: memo metadata & chat history ──────────────────────────────

export type MemoSummary = {
  _id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type MemoMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

export type MemoDetail = MemoSummary & { messages: MemoMessage[] };

export const memoMetaService = {
  create: (name: string, token?: string | null) =>
    mainApi
      .post<{ memo_id: string; name: string }>('/memo/', { name }, { headers: getAuthHeaders(token) })
      .then((r) => r.data),

  list: (token?: string | null) =>
    mainApi
      .get<{ memos: MemoSummary[] }>('/memo/', { headers: getAuthHeaders(token) })
      .then((r) => r.data.memos),

  get: (memoId: string, token?: string | null) =>
    mainApi
      .get<MemoDetail>(`/memo/${memoId}`, { headers: getAuthHeaders(token) })
      .then((r) => r.data),

  rename: (memoId: string, name: string, token?: string | null) =>
    mainApi
      .patch(`/memo/${memoId}`, { name }, { headers: getAuthHeaders(token) })
      .then((r) => r.data),

  delete: (memoId: string, token?: string | null) =>
    mainApi
      .delete(`/memo/${memoId}`, { headers: getAuthHeaders(token) })
      .then((r) => r.data),

  saveMessages: (memoId: string, messages: MemoMessage[], token?: string | null) =>
    mainApi
      .post(`/memo/${memoId}/messages`, { messages }, { headers: getAuthHeaders(token) })
      .then((r) => r.data),

  clearMessages: (memoId: string, token?: string | null) =>
    mainApi
      .delete(`/memo/${memoId}/messages`, { headers: getAuthHeaders(token) })
      .then((r) => r.data),
};

export default memoApi;
