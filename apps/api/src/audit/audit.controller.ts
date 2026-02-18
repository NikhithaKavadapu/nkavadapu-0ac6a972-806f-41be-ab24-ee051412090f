import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { RolesGuard, Roles } from '@secure-task-mgmt/auth';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';

@Controller('audit-log')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getAuditLog(
    @Request() req: { user: RequestUser },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const organizationIds =
      req.user.role === Role.SUPER_ADMIN
        ? organizationId ? [organizationId] : []
        : req.user.organizationId
          ? [req.user.organizationId]
          : [];
    return this.auditService.findByOrganizations(organizationIds, {
      page,
      limit,
      entityType,
      action,
    });
  }
}
