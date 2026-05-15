import { InjectionToken } from "@angular/core";

export interface FrontendRuntimeConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  foundationBasePath: string;
}

declare global {
  interface Window {
    __TIP_FRONTEND_CONFIG__?: Partial<FrontendRuntimeConfig>;
  }
}

const defaultConfig: FrontendRuntimeConfig = {
  apiBaseUrl: "/api",
  wsBaseUrl: "/api/realtime",
  foundationBasePath: "/frontend-foundation"
};

export const FRONTEND_RUNTIME_CONFIG =
  new InjectionToken<FrontendRuntimeConfig>("FRONTEND_RUNTIME_CONFIG");

export function readFrontendRuntimeConfig(): FrontendRuntimeConfig {
  if (typeof window === "undefined") {
    return defaultConfig;
  }

  return {
    apiBaseUrl:
      window.__TIP_FRONTEND_CONFIG__?.apiBaseUrl ?? defaultConfig.apiBaseUrl,
    wsBaseUrl:
      window.__TIP_FRONTEND_CONFIG__?.wsBaseUrl ?? defaultConfig.wsBaseUrl,
    foundationBasePath:
      window.__TIP_FRONTEND_CONFIG__?.foundationBasePath ??
      defaultConfig.foundationBasePath
  };
}
