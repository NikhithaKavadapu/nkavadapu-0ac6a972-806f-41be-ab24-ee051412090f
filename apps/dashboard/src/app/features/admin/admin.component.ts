import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, UserDto } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  toast = inject(ToastService);

  orgUsers = signal<UserDto[]>([]);
  loading = signal(true);

  get orgId(): string | null {
    return this.auth.currentUser()?.organizationId ?? null;
  }

  ngOnInit() {
    if (this.orgId) this.loadUsers();
  }

  loadUsers() {
    if (!this.orgId) return;
    this.loading.set(true);
    this.api.getOrganizationUsers(this.orgId).subscribe({
      next: (list) => {
        this.orgUsers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load users');
        this.loading.set(false);
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
