import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, AuditEntry } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  toast = inject(ToastService);

  entries = signal<AuditEntry[]>([]);
  total = signal(0);
  loading = signal(true);
  page = signal(1);
  limit = 20;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getAuditLog({ page: this.page(), limit: this.limit }).subscribe({
      next: (res) => {
        this.entries.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load audit log');
        this.loading.set(false);
      },
    });
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage() {
    if (this.page() * this.limit < this.total()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  formatDate(s: string): string {
    return new Date(s).toLocaleString();
  }
}
