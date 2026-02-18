import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, TaskDto } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TaskCardComponent } from './task-card/task-card.component';
import { TaskModalComponent } from './task-modal/task-modal.component';
import { ConfirmModalComponent } from './confirm-modal/confirm-modal.component';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';
type FilterCategory = 'all' | 'work' | 'personal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TaskCardComponent, TaskModalComponent, ConfirmModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  api = inject(ApiService);
  toast = inject(ToastService);
  private router = inject(Router);

  /** Display label for role */
  roleLabel = (role: string | undefined) => {
    if (!role) return '';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'user') return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  tasks = signal<TaskDto[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  filterStatus = signal<FilterStatus>('all');
  filterCategory = signal<FilterCategory>('all');
  viewMode = signal<'table' | 'kanban'>('table');
  showCreateModal = signal(false);
  editTask = signal<TaskDto | null>(null);
  deleteTask = signal<TaskDto | null>(null);

  filteredTasks = computed(() => {
    const list = this.tasks();
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();
    const category = this.filterCategory();
    return list.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (q && !(t.title.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q)))) return false;
      return true;
    });
  });

  stats = computed(() => {
    const list = this.tasks();
    const total = list.length;
    const completed = list.filter((t) => t.status === 'completed').length;
    const inProgress = list.filter((t) => t.status === 'in_progress').length;
    const pending = list.filter((t) => t.status === 'pending').length;
    return { total, completed, inProgress, pending };
  });

  ngOnInit() {
    if (this.auth.isSuperAdmin()) {
      this.router.navigate(['/super-admin']);
      return;
    }
    this.loadTasks();
  }

  loadTasks() {
    this.loading.set(true);
    this.api.getTasks().subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load tasks');
        this.loading.set(false);
      },
    });
  }

  openCreate() {
    this.showCreateModal.set(true);
  }

  openEdit(task: TaskDto) {
    this.editTask.set(task);
  }

  openDelete(task: TaskDto) {
    this.deleteTask.set(task);
  }

  deleteConfirmMessage(task: TaskDto): string {
    return 'Are you sure you want to delete "' + task.title + '"?';
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.editTask.set(null);
    this.deleteTask.set(null);
  }

  onTaskCreated() {
    this.closeModals();
    this.loadTasks();
    this.toast.success('Task created');
  }

  onTaskUpdated() {
    this.closeModals();
    this.loadTasks();
    this.toast.success('Task updated');
  }

  onTaskDeleted() {
    const task = this.deleteTask();
    if (!task) return;
    this.api.deleteTask(task.id).subscribe({
      next: () => {
        this.closeModals();
        this.loadTasks();
        this.toast.success(`Task "${task.title}" deleted`);
      },
      error: () => this.toast.error('Failed to delete task'),
    });
  }

  onReorder(ordered: TaskDto[]) {
    this.tasks.set(ordered);
    ordered.forEach((t, i) => {
      if (t.orderIndex === i) return;
      this.api.updateTask(t.id, { orderIndex: i }).subscribe({
        error: () => this.toast.error('Failed to reorder'),
      });
    });
  }

  /** Kanban: move task to new status (Admin/Owner only). Call from template with (drop)="onStatusDrop($event, 'pending')" */
  onStatusDrop(event: DragEvent, newStatus: 'pending' | 'in_progress' | 'completed') {
    event.preventDefault();
    if (!this.auth.canEdit()) return;
    const id = event.dataTransfer?.getData('text/plain');
    if (!id) return;
    const task = this.tasks().find((t) => t.id === id);
    if (!task || task.status === newStatus) return;
    this.api.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => this.loadTasks(),
      error: () => this.toast.error('Failed to update status'),
    });
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  tasksByStatus = computed(() => {
    const list = this.filteredTasks();
    return {
      pending: list.filter((t) => t.status === 'pending'),
      in_progress: list.filter((t) => t.status === 'in_progress'),
      completed: list.filter((t) => t.status === 'completed'),
    };
  });
}
