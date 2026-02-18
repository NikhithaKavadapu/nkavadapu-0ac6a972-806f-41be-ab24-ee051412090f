import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Role } from '@secure-task-mgmt/data';

/** Five default organizations – always seeded so "Failed to load organisations" does not occur */
const ORG_NAMES = [
  'Ryzen',
  'Acme Corp',
  'TechFlow',
  'Global Solutions',
  'NextGen Inc',
];
const SUPER_ADMIN_EMAIL = 'superadmin@platform.com';

@Injectable()
export class SeedOnBootstrap implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
  ) {}

  async onModuleInit() {
    try {
      // Backfill NULL name for existing users (legacy rows)
      const usersWithoutName = await this.userRepo.find({ where: { name: IsNull() } });
      for (const u of usersWithoutName) {
        await this.userRepo.update(u.id, { name: u.email || 'User' });
      }

      for (const name of ORG_NAMES) {
        const existing = await this.orgRepo.findOne({ where: { name } });
        if (!existing) {
          const org = this.orgRepo.create({ name });
          await this.orgRepo.save(org);
          console.log('[Seed] Organization:', name);
        }
      }

      const superAdminExists = await this.userRepo.findOne({
        where: { email: SUPER_ADMIN_EMAIL },
      });
      if (!superAdminExists) {
        const password = process.env['SEED_SUPER_ADMIN_PASSWORD'] || 'SuperAdmin123!';
        const admin = this.userRepo.create({
          name: 'Super Admin',
          email: SUPER_ADMIN_EMAIL,
          passwordHash: await bcrypt.hash(password, 10),
          role: Role.SUPER_ADMIN,
          organizationId: null,
        });
        await this.userRepo.save(admin);
        console.log('[Seed] Super Admin:', SUPER_ADMIN_EMAIL);
      }
    } catch (err) {
      console.error('[Seed] Error (server will keep running):', err);
    }
  }
}
