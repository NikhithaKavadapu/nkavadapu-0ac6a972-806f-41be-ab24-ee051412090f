import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@secure-task-mgmt/data';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user: { role: Role } | null): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(
      guard.canActivate(createMockContext({ role: Role.Viewer }))
    ).toBe(true);
  });

  it('should allow when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(
      guard.canActivate(createMockContext({ role: Role.Admin }))
    ).toBe(true);
    expect(
      guard.canActivate(createMockContext({ role: Role.Owner }))
    ).toBe(true);
  });

  it('should deny when user role is insufficient', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(() =>
      guard.canActivate(createMockContext({ role: Role.Viewer }))
    ).toThrow(ForbiddenException);
  });

  it('should deny when no user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Viewer]);
    expect(() => guard.canActivate(createMockContext(null))).toThrow(
      ForbiddenException
    );
  });
});
