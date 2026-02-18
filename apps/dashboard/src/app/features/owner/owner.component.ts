import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, UserDto } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-owner',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './owner.component.html',
  styleUrl: './owner.component.css',
})
export class OwnerComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  toast = inject(ToastService);
  private fb = inject(FormBuilder);

  orgUsers = signal<UserDto[]>([]);
  orgAdmins = signal<UserDto[]>([]);
  loadingUsers = signal(true);
  loadingAdmins = signal(true);
  showCreateAdminModal = signal(false);
  createAdminLoading = signal(false);

  createAdminForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
  });

  get orgId(): string | null {
    return this.auth.currentUser()?.organizationId ?? null;
  }

  ngOnInit() {
    if (this.orgId) {
      this.loadUsers();
      this.loadAdmins();
    }
  }

  loadUsers() {
    if (!this.orgId) return;
    this.loadingUsers.set(true);
    this.api.getOrganizationUsers(this.orgId).subscribe({
      next: (list) => {
        this.orgUsers.set(list);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.toast.error('Failed to load users');
        this.loadingUsers.set(false);
      },
    });
  }

  loadAdmins() {
    if (!this.orgId) return;
    this.loadingAdmins.set(true);
    this.api.getOrganizationAdmins(this.orgId).subscribe({
      next: (list) => {
        this.orgAdmins.set(list);
        this.loadingAdmins.set(false);
      },
      error: () => {
        this.toast.error('Failed to load admins');
        this.loadingAdmins.set(false);
      },
    });
  }

  openCreateAdmin() {
    this.createAdminForm.reset();
    this.showCreateAdminModal.set(true);
  }

  closeModal() {
    this.showCreateAdminModal.set(false);
  }

  onCreateAdmin() {
    if (this.createAdminForm.invalid) return;
    const { email, name } = this.createAdminForm.getRawValue();
    this.createAdminLoading.set(true);
    this.api.createAdmin(email, name || undefined).subscribe({
      next: (res) => {
        this.toast.success(`Admin created: ${res.email}. Temp password: ${res.temporaryPassword}`);
        this.closeModal();
        this.loadAdmins();
        this.loadUsers();
        this.createAdminLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to create admin');
        this.createAdminLoading.set(false);
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
