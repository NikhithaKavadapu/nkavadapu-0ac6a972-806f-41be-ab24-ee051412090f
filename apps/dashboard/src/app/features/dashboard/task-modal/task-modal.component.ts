import { Component, input, output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService, TaskDto, UserDto } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-modal.component.html',
  styleUrl: './task-modal.component.css',
})
export class TaskModalComponent implements OnInit {
  task = input<TaskDto | null>(null);
  mode = input<'create' | 'edit'>('create');
  saved = output<void>();
  cancel = output<void>();

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(false);
  orgUsers = signal<UserDto[]>([]);
  loadingUsers = signal(true);
  isEdit = computed(() => this.mode() === 'edit');

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    status: ['pending'],
    category: ['work'],
    orderIndex: [0],
    assignedToId: ['' as string | null],
  });

  ngOnInit() {
    this.api.getMyOrgUsers().subscribe({
      next: (list) => {
        this.orgUsers.set(list);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });

    const t = this.task();
    if (t) {
      this.form.patchValue({
        title: t.title,
        description: t.description ?? '',
        status: t.status,
        category: t.category,
        orderIndex: t.orderIndex,
        assignedToId: t.assignedToId ?? '',
      } as Record<string, unknown>);
    }
  }

  onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const val = this.form.getRawValue();
    const body = {
      title: val.title,
      description: val.description || undefined,
      status: val.status as 'pending' | 'in_progress' | 'completed',
      category: val.category as 'work' | 'personal',
      orderIndex: val.orderIndex,
      assignedToId: val.assignedToId || undefined,
    };
    if (this.mode() === 'edit' && this.task()) {
      this.api.updateTask(this.task()!.id, body).pipe(
        finalize(() => this.loading.set(false)),
      ).subscribe({
        next: () => this.saved.emit(),
        error: (e) => this.toast.error(e.error?.message || 'Failed to update task'),
      });
    } else {
      this.api.createTask(body).pipe(
        finalize(() => this.loading.set(false)),
      ).subscribe({
        next: () => this.saved.emit(),
        error: (e) => this.toast.error(e.error?.message || 'Failed to create task'),
      });
    }
  }
}
