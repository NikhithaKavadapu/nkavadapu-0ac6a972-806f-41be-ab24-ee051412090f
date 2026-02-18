import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission, Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.role) {
      throw new ForbiddenException('Access denied: no role');
    }

    const hasAny = requiredPermissions.some((p) =>
      hasPermission(user.role as Role, p),
    );

    if (!hasAny) {
      throw new ForbiddenException(
        `Access denied: requires one of [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
