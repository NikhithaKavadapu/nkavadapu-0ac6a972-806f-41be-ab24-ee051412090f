import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  userId: string;
  organizationId: string;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>
  ) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      userId: input.userId,
      organizationId: input.organizationId,
      metadata: input.metadata ?? null,
    });
    return this.auditRepo.save(entry);
  }

  async findByOrganization(
    organizationId: string,
    options: { page?: number; limit?: number; entityType?: string; action?: string } = {}
  ): Promise<{ data: AuditLog[]; total: number }> {
    return this.findByOrganizations([organizationId], options);
  }

  /** List audit logs for one or more organizations. Empty array = all (Super Admin). */
  async findByOrganizations(
    organizationIds: string[],
    options: { page?: number; limit?: number; entityType?: string; action?: string } = {}
  ): Promise<{ data: AuditLog[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (organizationIds.length > 0) {
      qb.where('log.organizationId IN (:...organizationIds)', { organizationIds });
    }

    if (options.entityType) {
      qb.andWhere('log.entityType = :entityType', {
        entityType: options.entityType,
      });
    }
    if (options.action) {
      qb.andWhere('log.action = :action', { action: options.action });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { data, total };
  }
}
