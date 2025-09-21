import type { ClientConfig, RequestOptions, APIError } from './types';

export class APIClient {
  private static instance: APIClient;
  private config: ClientConfig;

  private constructor(config: ClientConfig) {
    this.config = config;
  }

  static getInstance(config?: Partial<ClientConfig>): APIClient {
    if (!APIClient.instance) {
      const defaultConfig: ClientConfig = {
        baseUrl: 'http://localhost:3000/api',
        timeout: 30000,
        retries: 2,
      };
      APIClient.instance = new APIClient({ ...defaultConfig, ...config });
    }
    return APIClient.instance;
  }

  static configure(config: Partial<ClientConfig>): void {
    const defaultConfig: ClientConfig = {
      baseUrl: 'http://localhost:3000/api',
      timeout: 30000,
      retries: 2,
    };
    APIClient.instance = new APIClient({ ...defaultConfig, ...config });
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;
    const retries = options.retries ?? this.config.retries;

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new APIError(
            errorData.message || `HTTP ${response.status}`,
            errorData.code || 'HTTP_ERROR',
            response.status
          );
        }

        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          if (error instanceof APIError) throw error;
          throw new APIError(
            error instanceof Error ? error.message : 'Unknown error',
            'NETWORK_ERROR',
            0
          );
        }
        await this.delay(1000 * Math.pow(2, attempt));
      }
    }

    throw new APIError('Max retries exceeded', 'MAX_RETRIES', 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class APIError extends Error implements APIError {
  constructor(
    public message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}
