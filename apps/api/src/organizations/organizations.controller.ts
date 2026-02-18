import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service';
import { RolesGuard, Roles } from '@secure-task-mgmt/auth';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';
import { CreateOrganizationDto, CreateOwnerDto } from '@secure-task-mgmt/data';

@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  /** Public: list org names for signup dropdown */
  @Get('public')
  findPublicList() {
    return this.organizationsService.findPublicList();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  findAll(@Request() req: { user: RequestUser }) {
    return this.organizationsService.findAll(req.user);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Request() req: { user: RequestUser }, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(req.user, dto);
  }

  /** Admin/Owner: get users in my organization (for task assignment dropdown) */
  @Get('me/users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  getMyOrgUsers(@Request() req: { user: RequestUser }) {
    if (!req.user.organizationId) throw new ForbiddenException('No organization');
    return this.organizationsService.findUsersByOrg(req.user.organizationId, req.user);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  findOne(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.organizationsService.findOne(id, req.user);
  }

  @Post(':id/create-owner')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  createOwner(
    @Param('id') id: string,
    @Request() req: { user: RequestUser },
    @Body() dto: CreateOwnerDto,
  ) {
    return this.organizationsService.createOwner(id, req.user, dto);
  }

  @Get(':id/users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  getUsers(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.organizationsService.findUsersByOrg(id, req.user);
  }

  @Get(':id/admins')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  getAdmins(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.organizationsService.findAdminsByOrg(id, req.user);
  }
}
