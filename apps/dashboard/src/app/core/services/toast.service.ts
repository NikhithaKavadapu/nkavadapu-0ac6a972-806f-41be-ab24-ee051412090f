import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private nextId = 0;
  private defaultDuration = 4000;

  readonly items = this.toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration?: number) {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      message,
      type,
      duration: duration ?? this.defaultDuration,
    };
    this.toasts.update((t) => [...t, toast]);
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration ?? 6000);
  }

  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
