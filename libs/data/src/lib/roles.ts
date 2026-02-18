/**
 * Enterprise RBAC: Strict hierarchy
 * Super Admin → Organization Owner → Admin → User
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user',
}

export type Permission =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'view_tasks'
  | 'view_audit'
  | 'manage_org'
  | 'manage_users'
  | 'create_owner'
  | 'create_admin'
  | 'view_platform_users';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    'create_task', 'update_task', 'delete_task', 'view_tasks', 'view_audit',
    'manage_org', 'manage_users', 'create_owner', 'create_admin', 'view_platform_users',
  ],
  [Role.OWNER]: [
    'create_task', 'update_task', 'delete_task', 'view_tasks', 'view_audit',
    'manage_org', 'manage_users', 'create_admin',
  ],
  [Role.ADMIN]: ['create_task', 'update_task', 'delete_task', 'view_tasks', 'view_audit'],
  [Role.USER]: ['view_tasks'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
