import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = '/api';

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  category: 'work' | 'personal';
  orderIndex: number;
  organizationId: string;
  createdById: string;
  assignedToId: string | null;
  assignedToUser?: { id: string; name: string | null; email: string } | null;
  createdByUser?: { id: string; name: string | null; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  category?: 'work' | 'personal';
  orderIndex?: number;
  assignedToId?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  category?: 'work' | 'personal';
  orderIndex?: number;
  assignedToId?: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string;
  organizationId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditResponse {
  data: AuditEntry[];
  total: number;
}

export interface OrganizationDto {
  id: string;
  name: string;
  parentOrganizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getOrganizationsPublic() {
    return this.http.get<{ id: string; name: string }[]>(`${API}/organizations/public`);
  }

  getOrganizations() {
    return this.http.get<OrganizationDto[]>(`${API}/organizations`);
  }

  createOrganization(name: string) {
    return this.http.post<OrganizationDto>(`${API}/organizations`, { name });
  }

  createOwner(organizationId: string, email: string, name?: string) {
    return this.http.post<{ email: string; temporaryPassword: string }>(
      `${API}/organizations/${organizationId}/create-owner`,
      { email, name }
    );
  }

  getOrganizationUsers(organizationId: string) {
    return this.http.get<UserDto[]>(`${API}/organizations/${organizationId}/users`);
  }

  /** Admin/Owner: users in my org (for task assignment dropdown) */
  getMyOrgUsers() {
    return this.http.get<UserDto[]>(`${API}/organizations/me/users`);
  }

  getOrganizationAdmins(organizationId: string) {
    return this.http.get<UserDto[]>(`${API}/organizations/${organizationId}/admins`);
  }

  getPlatformUsers() {
    return this.http.get<UserDto[]>(`${API}/platform/users`);
  }

  createAdmin(email: string, name?: string) {
    return this.http.post<{ email: string; temporaryPassword: string }>(`${API}/admins`, { email, name });
  }

  getTasks() {
    return this.http.get<TaskDto[]>(`${API}/tasks`);
  }

  getTask(id: string) {
    return this.http.get<TaskDto>(`${API}/tasks/${id}`);
  }

  createTask(dto: CreateTaskDto) {
    return this.http.post<TaskDto>(`${API}/tasks`, dto);
  }

  updateTask(id: string, dto: UpdateTaskDto) {
    return this.http.put<TaskDto>(`${API}/tasks/${id}`, dto);
  }

  deleteTask(id: string) {
    return this.http.delete<void>(`${API}/tasks/${id}`);
  }

  getAuditLog(params?: { page?: number; limit?: number; entityType?: string; action?: string }) {
    let url = `${API}/audit-log?`;
    if (params?.page) url += `page=${params.page}&`;
    if (params?.limit) url += `limit=${params.limit}&`;
    if (params?.entityType) url += `entityType=${encodeURIComponent(params.entityType)}&`;
    if (params?.action) url += `action=${encodeURIComponent(params.action)}&`;
    return this.http.get<AuditResponse>(url.replace(/\&$/, ''));
  }
}
