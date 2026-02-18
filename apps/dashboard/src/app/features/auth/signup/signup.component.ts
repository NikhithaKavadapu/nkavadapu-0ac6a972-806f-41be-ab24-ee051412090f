import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { finalize } from 'rxjs';

const API = '/api';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  /** Default 5 org names – shown when API fails; user must start API to get real list */
  static readonly DEFAULT_ORG_NAMES = ['Ryzen', 'Acme Corp', 'TechFlow', 'Global Solutions', 'NextGen Inc'];

  organizations = signal<{ id: string; name: string }[]>([]);
  loadingOrgs = signal(true);
  loadError = signal(false);
  loading = false;
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    organizationId: ['', Validators.required],
  });

  ngOnInit() {
    this.loadError.set(false);
    this.http.get<{ id: string; name: string }[]>(`${API}/organizations/public`).subscribe({
      next: (list) => {
        this.organizations.set(list);
        this.loadingOrgs.set(false);
      },
      error: (err) => {
        this.loadError.set(true);
        this.loadingOrgs.set(false);
        const msg = err.status === 504 || err.status === 0
          ? 'Start the API (npm run start:api) to load organizations.'
          : 'Failed to load organizations';
        this.toast.error(msg);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid || this.loading) return;
    const { name, email, password, confirmPassword, organizationId } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.toast.error('Passwords do not match');
      return;
    }
    this.loading = true;
    this.auth.signup(name, email, password, organizationId).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => {
        this.toast.success('Account created! Welcome.');
        this.auth.navigateByRole();
      },
      error: (err) => {
        this.toast.error(err.error?.message || err.message || 'Sign up failed');
      },
    });
  }
}
