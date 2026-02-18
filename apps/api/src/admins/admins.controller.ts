import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from '../organizations/organizations.service';
import { RolesGuard, Roles } from '@secure-task-mgmt/auth';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';
import { CreateAdminDto } from '@secure-task-mgmt/data';

@Controller('admins')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.OWNER)
export class AdminsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  createAdmin(@Request() req: { user: RequestUser }, @Body() dto: CreateAdminDto) {
    return this.organizationsService.createAdmin(req.user, dto);
  }
}
