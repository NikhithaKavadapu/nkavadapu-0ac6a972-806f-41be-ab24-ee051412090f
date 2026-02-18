import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto, UpdateTaskDto } from '@secure-task-mgmt/data';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * List tasks scoped by role:
   * - Super Admin: platform-wide (optional filter by org)
   * - Owner: organizationId IN (owner org + child orgs) — simplified to owner's orgId
   * - Admin: organizationId = admin.organizationId
   * - User: assignedToId = currentUser.id (mandatory)
   */
  async findAll(user: RequestUser, organizationIdFilter?: string): Promise<Task[]> {
    if (user.role === Role.SUPER_ADMIN) {
      const where: { organizationId?: string } = {};
      if (organizationIdFilter) where.organizationId = organizationIdFilter;
      return this.taskRepo.find({
        where,
        order: { orderIndex: 'ASC', createdAt: 'DESC' },
        relations: ['createdByUser', 'assignedToUser'],
      });
    }
    if (user.role === Role.OWNER && user.organizationId) {
      const orgId = organizationIdFilter && organizationIdFilter === user.organizationId
        ? user.organizationId
        : user.organizationId;
      return this.taskRepo.find({
        where: { organizationId: orgId },
        order: { orderIndex: 'ASC', createdAt: 'DESC' },
        relations: ['createdByUser', 'assignedToUser'],
      });
    }
    if (user.role === Role.ADMIN && user.organizationId) {
      return this.taskRepo.find({
        where: { organizationId: user.organizationId },
        order: { orderIndex: 'ASC', createdAt: 'DESC' },
        relations: ['createdByUser', 'assignedToUser'],
      });
    }
    if (user.role === Role.USER) {
      return this.taskRepo.find({
        where: { assignedToId: user.id },
        order: { orderIndex: 'ASC', createdAt: 'DESC' },
        relations: ['createdByUser', 'assignedToUser'],
      });
    }
    return [];
  }

  async findOne(id: string, user: RequestUser): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['createdByUser', 'assignedToUser'],
    });
    if (!task) throw new NotFoundException('Task not found');
    if (user.role === Role.SUPER_ADMIN) return task;
    if (user.role === Role.USER) {
      if (task.assignedToId !== user.id) throw new ForbiddenException('Access denied');
      return task;
    }
    if (user.organizationId && task.organizationId === user.organizationId) return task;
    throw new ForbiddenException('Access denied');
  }

  /** Create: Admin/Owner/Super Admin. assignedToId must be in same org. */
  async create(dto: CreateTaskDto, user: RequestUser): Promise<Task> {
    if (user.role === Role.USER) {
      throw new ForbiddenException('Users have read-only access to tasks');
    }
    let organizationId: string;
    if (user.role === Role.SUPER_ADMIN && dto.organizationId) {
      organizationId = dto.organizationId;
    } else if (user.organizationId) {
      organizationId = user.organizationId;
    } else {
      throw new ForbiddenException('Organization required to create task');
    }

    let assignedToId: string | null = dto.assignedToId ?? null;
    if (assignedToId) {
      const assignee = await this.userRepo.findOne({ where: { id: assignedToId } });
      if (!assignee) throw new BadRequestException('Assigned user not found');
      if (assignee.organizationId !== organizationId) {
        throw new BadRequestException('Assigned user must belong to the same organization');
      }
    }

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'pending',
      category: dto.category ?? 'work',
      orderIndex: dto.orderIndex ?? 0,
      organizationId,
      createdById: user.id,
      assignedToId,
    });
    return this.taskRepo.save(task);
  }

  /** Update: Admin/Owner only. Can update status and assignment. */
  async update(id: string, dto: UpdateTaskDto, user: RequestUser): Promise<Task> {
    if (user.role === Role.USER) {
      throw new ForbiddenException('Users have read-only access to tasks');
    }
    const task = await this.findOne(id, user);

    if (dto.assignedToId !== undefined) {
      if (dto.assignedToId === null || dto.assignedToId === '') {
        task.assignedToId = null;
      } else {
        const assignee = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
        if (!assignee) throw new BadRequestException('Assigned user not found');
        if (assignee.organizationId !== task.organizationId) {
          throw new BadRequestException('Assigned user must belong to the same organization');
        }
        task.assignedToId = dto.assignedToId;
      }
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.category !== undefined) task.category = dto.category;
    if (dto.orderIndex !== undefined) task.orderIndex = dto.orderIndex;
    return this.taskRepo.save(task);
  }

  /** Delete: Admin/Owner/Super Admin only. */
  async remove(id: string, user: RequestUser): Promise<void> {
    if (user.role === Role.USER) {
      throw new ForbiddenException('Users have read-only access to tasks');
    }
    const task = await this.findOne(id, user);
    await this.taskRepo.remove(task);
  }
}
