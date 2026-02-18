import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, TaskDto } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
})
export class TaskCardComponent {
  task = input.required<TaskDto>();
  canEdit = input<boolean>(false);
  statusChange = output<void>();
  edit = output<TaskDto>();
  delete = output<TaskDto>();

  private api = inject(ApiService);
  private toast = inject(ToastService);

  statusLabel(s: string): string {
    return s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  categoryLabel(c: string): string {
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  statusColor(s: string): string {
    switch (s) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-amber-500/20 text-amber-400';
    }
  }

  onStatusChange(task: TaskDto, newStatus: 'pending' | 'in_progress' | 'completed') {
    if (!this.canEdit() || task.status === newStatus) return;
    this.api.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => this.statusChange.emit(),
      error: () => this.toast.error('Failed to update status'),
    });
  }

  emitEdit(t: TaskDto) {
    this.edit.emit(t);
  }

  emitDelete(t: TaskDto) {
    this.delete.emit(t);
  }
}
