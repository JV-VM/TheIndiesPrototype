import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

import { AuthService } from "./auth.service";

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureSessionRestored();

  if (authService.isAuthenticated()) {
    return router.createUrlTree(["/dashboard"]);
  }

  return true;
};
