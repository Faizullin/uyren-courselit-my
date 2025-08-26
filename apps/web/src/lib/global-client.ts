"use client";

// add type safety for window
declare global {
  interface Window {
    __appClient?: AppClient;
  }
}

export function getGlobalAppClient() {
  if (typeof window === "undefined") {
    throw new Error("Global client is only available in browser");
  }

  if (!window.__appClient) {
    window.__appClient = new AppClient();
  }
  return window.__appClient;
}

type AppClientConfig = {
  useNotificationsStream: boolean;
  meta: Record<string, unknown>;
};

class AppClient {
  private config: AppClientConfig = {
    useNotificationsStream: false,
    meta: {},
  };

  setConfig(config: Partial<AppClientConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(key: keyof AppClientConfig) {
    return this.config[key];
  }
}
