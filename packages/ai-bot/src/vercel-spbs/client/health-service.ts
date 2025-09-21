import { APIClient } from './api-client';
import type { HealthCheck, RequestOptions } from './types';

export class HealthService {
  private static api = APIClient.getInstance();

  static configure(config: Partial<{ baseUrl: string; timeout: number; retries: number }>): void {
    APIClient.configure(config);
    this.api = APIClient.getInstance();
  }

  static async checkHealth(options?: RequestOptions): Promise<HealthCheck> {
    return this.api.request<HealthCheck>('/health', {
      method: 'GET',
      ...options,
    });
  }

  static async isHealthy(options?: RequestOptions): Promise<boolean> {
    try {
      const health = await this.checkHealth(options);
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  static async waitForHealth(
    maxAttempts = 10,
    delayMs = 1000,
    options?: RequestOptions
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await this.isHealthy(options)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }
}
