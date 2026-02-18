import { Role } from './roles';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId: string | null;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  name?: string;
  email: string;
  role: Role;
  organizationId: string | null;
  requiresPasswordChange?: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskCategory = 'work' | 'personal';

export interface TaskDto {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  orderIndex: number;
  organizationId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  parentOrganizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}
