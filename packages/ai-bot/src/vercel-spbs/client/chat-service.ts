import { APIClient } from './api-client';
import type { ChatRequest, ChatResponse, RequestOptions } from './types';

export class ChatService {
  private static api = APIClient.getInstance();

  static configure(config: Partial<{ baseUrl: string; timeout: number; retries: number }>): void {
    APIClient.configure(config);
    this.api = APIClient.getInstance();
  }

  static async sendMessage(
    request: ChatRequest,
    options?: RequestOptions
  ): Promise<ChatResponse> {
    return this.api.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  static async sendStreamMessage(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    options?: RequestOptions
  ): Promise<void> {
    const response = await fetch(`${this.api['config'].baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Stream not available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  static async getChatHistory(
    sessionId: string,
    options?: RequestOptions
  ): Promise<ChatResponse[]> {
    return this.api.request<ChatResponse[]>(`/chat/history/${sessionId}`, {
      method: 'GET',
      ...options,
    });
  }
}
