import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { AuthService } from '../services/auth';

// This only decides which page to show. The real protection is on the server.
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (!user) return router.createUrlTree(['/login']);
  return roles.includes(user.role) ? true : router.createUrlTree([auth.homeFor(user.role)]);
};
