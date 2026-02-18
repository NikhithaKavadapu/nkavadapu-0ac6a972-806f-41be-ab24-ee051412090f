import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const TOKEN_KEY = 'task_mgmt_token';
const USER_KEY = 'task_mgmt_user';
const API = '/api';

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  organizationId: string | null;
  requiresPasswordChange?: boolean;
}

export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'owner':
      return '/owner';
    case 'admin':
      return '/admin';
    case 'user':
    default:
      return '/dashboard';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private token = signal<string | null>(this.loadToken());
  private user = signal<AuthUser | null>(this.loadUser());

  isAuthenticated = computed(() => !!this.token());
  currentUser = computed(() => this.user());

  getToken(): string | null {
    return this.token();
  }

  private loadToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${API}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.token.set(res.access_token);
          this.user.set(res.user);
        })
      );
  }

  signup(name: string, email: string, password: string, organizationId: string) {
    return this.http
      .post<LoginResponse>(`${API}/auth/signup`, { name, email, password, organizationId })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.token.set(res.access_token);
          this.user.set(res.user);
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http
      .post<LoginResponse>(`${API}/auth/change-password`, {
        currentPassword,
        newPassword,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.token.set(res.access_token);
          this.user.set(res.user);
        })
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  navigateByRole() {
    const u = this.user();
    if (!u) {
      this.router.navigate(['/login']);
      return;
    }
    if (u.requiresPasswordChange) {
      this.router.navigate(['/change-password']);
      return;
    }
    this.router.navigate([getDefaultRouteForRole(u.role)]);
  }

  requiresPasswordChange(): boolean {
    return this.currentUser()?.requiresPasswordChange === true;
  }

  isSuperAdmin(): boolean {
    return this.currentUser()?.role === 'super_admin';
  }

  isOwner(): boolean {
    return this.currentUser()?.role === 'owner';
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  canEditTasks(): boolean {
    const r = this.currentUser()?.role;
    return r === 'super_admin' || r === 'owner' || r === 'admin';
  }

  /** Alias for template: can create/edit/delete tasks */
  canEdit(): boolean {
    return this.canEditTasks();
  }

  canViewAudit(): boolean {
    const r = this.currentUser()?.role;
    return r === 'super_admin' || r === 'owner' || r === 'admin';
  }
}
