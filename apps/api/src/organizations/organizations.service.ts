import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Role } from '@secure-task-mgmt/data';
import type { RequestUser } from '@secure-task-mgmt/data';
import { CreateOrganizationDto, CreateOwnerDto, CreateAdminDto } from '@secure-task-mgmt/data';

const BCRYPT_ROUNDS = 10;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let s = '';
  for (let i = 0; i < 12; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** Public: id + name for signup dropdown */
  async findPublicList(): Promise<{ id: string; name: string }[]> {
    const list = await this.orgRepo.find({ order: { name: 'ASC' }, select: ['id', 'name'] });
    return list;
  }

  /** Super Admin: list all organizations */
  async findAll(user: RequestUser): Promise<Organization[]> {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can list all organizations');
    }
    return this.orgRepo.find({ order: { name: 'ASC' } });
  }

  /** Super Admin: create organization */
  async create(user: RequestUser, dto: CreateOrganizationDto): Promise<Organization> {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create organizations');
    }
    const name = dto.name.trim();
    const existing = await this.orgRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('Organization with this name already exists');
    const org = this.orgRepo.create({ name });
    return this.orgRepo.save(org);
  }

  /** Super Admin or Owner (own org): get one organization */
  async findOne(id: string, user: RequestUser): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    if (user.role === Role.SUPER_ADMIN) return org;
    if (user.role === Role.OWNER && user.organizationId === id) return org;
    if (user.role === Role.ADMIN && user.organizationId === id) return org;
    throw new ForbiddenException('Access denied');
  }

  /** Super Admin: generate Owner credentials for an organization */
  async createOwner(
    orgId: string,
    user: RequestUser,
    dto: CreateOwnerDto,
  ): Promise<{ email: string; temporaryPassword: string }> {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create owners');
    }
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('User with this email already exists');

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    const owner = this.userRepo.create({
      name: dto.name?.trim() ?? email.split('@')[0],
      email,
      passwordHash,
      role: Role.OWNER,
      organizationId: org.id,
      requiresPasswordChange: true,
    });
    await this.userRepo.save(owner);
    return { email: owner.email, temporaryPassword };
  }

  /** Owner: create Admin for their organization */
  async createAdmin(user: RequestUser, dto: CreateAdminDto): Promise<{ email: string; temporaryPassword: string }> {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only Owner can create admins');
    }
    if (!user.organizationId) throw new ForbiddenException('Owner must belong to an organization');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('User with this email already exists');

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    const admin = this.userRepo.create({
      name: dto.name?.trim() ?? email.split('@')[0],
      email,
      passwordHash,
      role: Role.ADMIN,
      organizationId: user.organizationId,
      requiresPasswordChange: true,
    });
    await this.userRepo.save(admin);
    return { email: admin.email, temporaryPassword };
  }

  /** Organization users (Super Admin any org; Owner/Admin their org) */
  async findUsersByOrg(orgId: string, user: RequestUser): Promise<User[]> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (user.role === Role.SUPER_ADMIN) {
      return this.userRepo.find({
        where: { organizationId: orgId },
        relations: ['organization'],
        order: { email: 'ASC' },
      });
    }
    if (user.role === Role.OWNER && user.organizationId === orgId) {
      return this.userRepo.find({
        where: { organizationId: orgId },
        relations: ['organization'],
        order: { email: 'ASC' },
      });
    }
    if (user.role === Role.ADMIN && user.organizationId === orgId) {
      return this.userRepo.find({
        where: { organizationId: orgId },
        relations: ['organization'],
        order: { email: 'ASC' },
      });
    }
    throw new ForbiddenException('Access denied');
  }

  /** Admins of an organization (Owner: their org; Super Admin: any) */
  async findAdminsByOrg(orgId: string, user: RequestUser): Promise<User[]> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (user.role === Role.SUPER_ADMIN) {
      return this.userRepo.find({
        where: { organizationId: orgId, role: Role.ADMIN },
        relations: ['organization'],
        order: { email: 'ASC' },
      });
    }
    if (user.role === Role.OWNER && user.organizationId === orgId) {
      return this.userRepo.find({
        where: { organizationId: orgId, role: Role.ADMIN },
        relations: ['organization'],
        order: { email: 'ASC' },
      });
    }
    throw new ForbiddenException('Access denied');
  }

  /** Super Admin: all users across platform */
  async findPlatformUsers(user: RequestUser): Promise<User[]> {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can view platform users');
    }
    return this.userRepo.find({
      relations: ['organization'],
      order: { email: 'ASC' },
    });
  }
}
