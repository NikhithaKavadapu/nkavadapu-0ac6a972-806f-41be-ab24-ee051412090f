import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '@secure-task-mgmt/data';
import { RolesGuard, Roles } from '@secure-task-mgmt/auth';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.USER)
  findAll(
    @Request() req: { user: RequestUser },
    @Query('organizationId') organizationId?: string,
  ) {
    return this.tasksService.findAll(req.user, organizationId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.USER)
  findOne(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.tasksService.findOne(id, req.user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  create(@Body() dto: CreateTaskDto, @Request() req: { user: RequestUser }) {
    return this.tasksService.create(dto, req.user);
  }

  @Put(':id')
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: { user: RequestUser },
  ) {
    return this.tasksService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.tasksService.remove(id, req.user);
  }
}
