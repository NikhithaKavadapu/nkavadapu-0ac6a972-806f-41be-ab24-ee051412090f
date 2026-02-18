import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 text-slate-100">
      <router-outlet />
    </main>
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
      @for (t of toast.items(); track t.id) {
        <div
          [class]="'relative px-4 py-3 pr-8 rounded-xl shadow-lg border ' + toastClass(t.type)"
          role="alert"
        >
          <p class="text-sm font-medium">{{ t.message }}</p>
          <button (click)="toast.dismiss(t.id)" class="absolute top-2 right-2 text-slate-400 hover:text-white text-lg leading-none" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class AppComponent {
  toast = inject(ToastService);

  toastClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-900/90 border-emerald-700 text-emerald-100';
      case 'error': return 'bg-rose-900/90 border-rose-700 text-rose-100';
      default: return 'bg-slate-800 border-slate-600 text-slate-100';
    }
  }
}
