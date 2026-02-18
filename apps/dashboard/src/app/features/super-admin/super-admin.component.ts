import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, OrganizationDto, UserDto } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.css',
})
export class SuperAdminComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  toast = inject(ToastService);
  private fb = inject(FormBuilder);

  /** Default 5 org names shown when API fails or as placeholder */
  static readonly DEFAULT_ORG_NAMES = ['Ryzen', 'Acme Corp', 'TechFlow', 'Global Solutions', 'NextGen Inc'];

  organizations = signal<OrganizationDto[]>([]);
  platformUsers = signal<UserDto[]>([]);
  loadingOrgs = signal(true);
  loadingUsers = signal(false);
  orgLoadError = signal(false);
  showCreateOrgModal = signal(false);
  showCreateOwnerModal = signal(false);
  selectedOrgId = signal<string | null>(null);
  createOwnerLoading = signal(false);

  createOrgForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  createOwnerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
  });

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.loadingOrgs.set(true);
    this.orgLoadError.set(false);
    this.api.getOrganizations().subscribe({
      next: (list) => {
        this.organizations.set(list);
        this.loadingOrgs.set(false);
      },
      error: (err) => {
        this.orgLoadError.set(true);
        this.loadingOrgs.set(false);
        const msg = err.status === 504 || err.status === 0
          ? 'API not responding. Start it with: npm run start:api (port 3333)'
          : err.error?.message || 'Failed to load organizations';
        this.toast.error(msg);
      },
    });
  }

  loadPlatformUsers() {
    this.loadingUsers.set(true);
    this.api.getPlatformUsers().subscribe({
      next: (list) => this.platformUsers.set(list),
      error: () => this.toast.error('Failed to load users'),
      complete: () => this.loadingUsers.set(false),
    });
  }

  openCreateOrg() {
    this.createOrgForm.reset();
    this.showCreateOrgModal.set(true);
  }

  openCreateOwner(orgId: string) {
    this.selectedOrgId.set(orgId);
    this.createOwnerForm.reset();
    this.showCreateOwnerModal.set(true);
  }

  closeModals() {
    this.showCreateOrgModal.set(false);
    this.showCreateOwnerModal.set(false);
    this.selectedOrgId.set(null);
  }

  onCreateOrg() {
    if (this.createOrgForm.invalid) return;
    const name = this.createOrgForm.getRawValue().name;
    this.api.createOrganization(name).subscribe({
      next: () => {
        this.toast.success(`Organization "${name}" created`);
        this.closeModals();
        this.loadOrganizations();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to create organization'),
    });
  }

  onCreateOwner() {
    if (this.createOwnerForm.invalid || !this.selectedOrgId()) return;
    const orgId = this.selectedOrgId()!;
    const { email, name } = this.createOwnerForm.getRawValue();
    this.createOwnerLoading.set(true);
    this.api.createOwner(orgId, email, name || undefined).subscribe({
      next: (res) => {
        this.toast.success(`Owner created: ${res.email}. Temp password: ${res.temporaryPassword}`);
        this.closeModals();
        this.createOwnerLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to create owner');
        this.createOwnerLoading.set(false);
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  get defaultOrgNames(): string {
    return SuperAdminComponent.DEFAULT_ORG_NAMES.join(', ');
  }
}
