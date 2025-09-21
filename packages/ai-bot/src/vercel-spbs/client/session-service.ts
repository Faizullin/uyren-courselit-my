import { APIClient } from './api-client';
import type { SessionCreate, SessionResponse, RequestOptions } from './types';

export class SessionService {
  private static api = APIClient.getInstance();

  static configure(config: Partial<{ baseUrl: string; timeout: number; retries: number }>): void {
    APIClient.configure(config);
    this.api = APIClient.getInstance();
  }

  static async createSession(
    request: SessionCreate,
    options?: RequestOptions
  ): Promise<SessionResponse> {
    return this.api.request<SessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  static async getSession(
    sessionId: string,
    options?: RequestOptions
  ): Promise<SessionResponse> {
    return this.api.request<SessionResponse>(`/sessions/${sessionId}`, {
      method: 'GET',
      ...options,
    });
  }

  static async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionResponse, 'metadata'>>,
    options?: RequestOptions
  ): Promise<SessionResponse> {
    return this.api.request<SessionResponse>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      ...options,
    });
  }

  static async deleteSession(
    sessionId: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.api.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
      ...options,
    });
  }

  static async getUserSessions(
    userId: string,
    options?: RequestOptions
  ): Promise<SessionResponse[]> {
    return this.api.request<SessionResponse[]>(`/sessions/user/${userId}`, {
      method: 'GET',
      ...options,
    });
  }
}
