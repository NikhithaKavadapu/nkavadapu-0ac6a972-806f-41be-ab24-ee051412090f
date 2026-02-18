import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from '../organizations/organizations.service';
import { RolesGuard, Roles } from '@secure-task-mgmt/auth';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';

@Controller('platform')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PlatformController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('users')
  getPlatformUsers(@Request() req: { user: RequestUser }) {
    return this.organizationsService.findPlatformUsers(req.user);
  }
}
