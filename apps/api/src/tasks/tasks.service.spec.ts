import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from '../entities/task.entity';
import { AuditService } from '../audit/audit.service';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let auditService: jest.Mocked<AuditService>;

  const adminUser: RequestUser = {
    id: 'u1',
    email: 'admin@test.com',
    organizationId: 'org1',
    role: Role.Admin,
  };

  const viewerUser: RequestUser = {
    ...adminUser,
    role: Role.Viewer,
  };

  const mockTask = {
    id: 'task-1',
    title: 'Test',
    description: null,
    status: 'pending' as const,
    category: 'work' as const,
    orderIndex: 0,
    organizationId: 'org1',
    createdById: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Task;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn((x) => ({ ...x, id: 'new-id' })),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(TasksService);
    taskRepo = module.get(getRepositoryToken(Task));
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should allow Admin to create task', async () => {
      const created = await service.create(
        { title: 'New Task', category: 'work' },
        adminUser
      );
      expect(created.title).toBe('New Task');
      expect(created.organizationId).toBe('org1');
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should reject Viewer creating task', async () => {
      await expect(
        service.create({ title: 'New' }, viewerUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return only org-scoped tasks', async () => {
      taskRepo.find.mockResolvedValue([mockTask]);
      const list = await service.findAll(adminUser);
      expect(list).toHaveLength(1);
      expect(taskRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org1' },
        })
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFound when task not in org', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('task-1', adminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
