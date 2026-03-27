import axios from 'axios';

const MEMO_API_URL = process.env.EXPO_PUBLIC_MEMO_API_URL || 'http://localhost:8000';

const memoApi = axios.create({
  baseURL: MEMO_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type MemoSessionHeaders = {
  'X-Session-ID'?: string;
};

const getSessionHeaders = (sessionId: string): MemoSessionHeaders => ({
  'X-Session-ID': sessionId,
});

export const memoApiService = {
  addText: async (text: string, sessionId: string) => {
    const response = await memoApi.post(
      '/documents/text',
      { text },
      { headers: getSessionHeaders(sessionId) }
    );
    return response.data;
  },

  addFiles: async (files: { uri: string; name: string; type?: string }[], sessionId: string) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as any);
    });
    const response = await memoApi.post('/documents/files', formData, {
      headers: getSessionHeaders(sessionId),
    });
    return response.data;
  },

  query: async (question: string, sessionId: string) => {
    const response = await memoApi.post(
      '/query',
      { question },
      { headers: getSessionHeaders(sessionId) }
    );
    return response.data;
  },

  getDocumentCount: async (sessionId: string) => {
    const response = await memoApi.get('/documents/count', {
      headers: getSessionHeaders(sessionId),
    });
    return response.data;
  },

  clearDocuments: async (sessionId: string) => {
    const response = await memoApi.delete('/documents', {
      headers: getSessionHeaders(sessionId),
    });
    return response.data;
  },
};

export default memoApi;
