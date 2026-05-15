import { APP_INITIALIZER, ApplicationConfig } from "@angular/core";
import {
  provideHttpClient,
  withInterceptors
} from "@angular/common/http";
import { provideRouter } from "@angular/router";

import { authInterceptor } from "./core/auth/auth.interceptor";
import { AuthService } from "./core/auth/auth.service";
import {
  FRONTEND_RUNTIME_CONFIG,
  readFrontendRuntimeConfig
} from "./core/config/runtime-config";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    {
      provide: FRONTEND_RUNTIME_CONFIG,
      useFactory: readFrontendRuntimeConfig
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (authService: AuthService) => () =>
        authService.ensureSessionRestored(),
      deps: [AuthService]
    }
  ]
};
