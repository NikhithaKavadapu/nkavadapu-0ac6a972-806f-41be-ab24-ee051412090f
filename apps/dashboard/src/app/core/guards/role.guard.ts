import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, getDefaultRouteForRole } from '../services/auth.service';

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }
    const role = auth.currentUser()?.role;
    if (role && allowedRoles.includes(role)) return true;
    router.navigate([getDefaultRouteForRole(role ?? 'user')]);
    return false;
  };
}

export const superAdminGuard = roleGuard(['super_admin']);
export const ownerGuard = roleGuard(['owner']);
export const adminGuard = roleGuard(['admin']);
