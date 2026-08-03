import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export type VoiceEvent =
  | 'session.start'
  | 'session.started'
  | 'audio.input.chunk'
  | 'audio.input.commit'
  | 'transcript.partial'
  | 'transcript.final'
  | 'assistant.text'
  | 'assistant.audio.chunk'
  | 'assistant.audio.end'
  | 'session.interrupt'
  | 'session.end'
  | 'error';

type RealtimeMessage<T = Record<string, any>> = {
  event: VoiceEvent;
  data: T;
};

type RealtimeHandlers = {
  onMessage: (message: RealtimeMessage) => void;
  onError?: (error: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function buildVoiceWsUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }
  const normalized = apiUrl.replace(/\/+$/, '');
  if (normalized.startsWith('https://')) {
    return `${normalized.replace('https://', 'wss://')}/chat/realtime`;
  }
  if (normalized.startsWith('http://')) {
    return `${normalized.replace('http://', 'ws://')}/chat/realtime`;
  }
  return `${normalized}/chat/realtime`;
}

export class VoiceRealtimeClient {
  private socket: WebSocket | null = null;
  private handlers: RealtimeHandlers;

  constructor(handlers: RealtimeHandlers) {
    this.handlers = handlers;
  }

  connect() {
    this.socket = new WebSocket(buildVoiceWsUrl());
    this.socket.onopen = () => this.handlers.onOpen?.();
    this.socket.onclose = () => this.handlers.onClose?.();
    this.socket.onerror = () => this.handlers.onError?.('WebSocket connection error.');
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeMessage;
        this.handlers.onMessage(parsed);
      } catch {
        this.handlers.onError?.('Invalid message from server.');
      }
    };
  }

  send(event: VoiceEvent, data: Record<string, any> = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Voice session is not connected.');
    }
    this.socket.send(JSON.stringify({ event, data }));
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }
}

export async function recordingToBase64(uri: string) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
}
