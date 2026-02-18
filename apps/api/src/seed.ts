/**
 * Standalone seed: 1 Super Admin, 5 Organizations, owners/admins/users, sample assigned tasks.
 * Run: npm run seed (or ts-node -r tsconfig-paths/register apps/api/src/seed.ts)
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { Task } from './entities/task.entity';
import { Role } from '@secure-task-mgmt/data';

const dataSource = new DataSource({
  type: 'sqlite',
  database: process.env['DB_DATABASE'] || 'data/tasks.sqlite',
  entities: [User, Organization, Task],
  synchronize: false,
});

const ORG_NAMES = ['Ryzen', 'Acme Corp', 'TechFlow', 'Global Solutions', 'NextGen Inc'];
const SUPER_ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] || 'superadmin@platform.com';

async function seed() {
  await dataSource.initialize();
  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);

  const orgs: Organization[] = [];
  for (const name of ORG_NAMES) {
    let org = await orgRepo.findOne({ where: { name } });
    if (!org) {
      org = orgRepo.create({ name });
      org = await orgRepo.save(org);
      orgs.push(org);
      console.log('Created organization:', name);
    } else {
      orgs.push(org);
    }
  }

  let superAdmin = await userRepo.findOne({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!superAdmin) {
    const password = process.env['SEED_SUPER_ADMIN_PASSWORD'] || 'SuperAdmin123!';
    superAdmin = userRepo.create({
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(password, 10),
      role: Role.SUPER_ADMIN,
      organizationId: null,
    });
    superAdmin = await userRepo.save(superAdmin);
    console.log('Created Super Admin:', SUPER_ADMIN_EMAIL);
  }

  for (let i = 0; i < orgs.length; i++) {
    const org = orgs[i];
    const ownerEmail = `owner${i + 1}@${org.name.toLowerCase().replace(/\s/g, '')}.com`;
    if (!(await userRepo.findOne({ where: { email: ownerEmail } }))) {
      const owner = userRepo.create({
        name: `Owner ${org.name}`,
        email: ownerEmail,
        passwordHash: await bcrypt.hash('Owner123!', 10),
        role: Role.OWNER,
        organizationId: org.id,
      });
      await userRepo.save(owner);
      console.log('Created owner:', ownerEmail);
    }
  }

  const adminEmails = ['admin_hyd@ryzen.com', 'admin_blr@ryzen.com'];
  const ryzen = orgs.find((o) => o.name === 'Ryzen');
  if (ryzen) {
    for (const email of adminEmails) {
      if (!(await userRepo.findOne({ where: { email } }))) {
        const admin = userRepo.create({
          name: email.split('@')[0],
          email,
          passwordHash: await bcrypt.hash('Admin123!', 10),
          role: Role.ADMIN,
          organizationId: ryzen.id,
        });
        await userRepo.save(admin);
        console.log('Created admin:', email);
      }
    }
  }

  let sampleUser: User | null = null;
  const userEmail = 'user@ryzen.com';
  if (ryzen) {
    sampleUser = await userRepo.findOne({ where: { email: userEmail } });
    if (!sampleUser) {
      sampleUser = userRepo.create({
        name: 'Sample User',
        email: userEmail,
        passwordHash: await bcrypt.hash('User123!', 10),
        role: Role.USER,
        organizationId: ryzen.id,
      });
      sampleUser = await userRepo.save(sampleUser);
      console.log('Created user:', userEmail);
    }
  }

  const taskRepo = dataSource.getRepository(Task);
  const adminUser = ryzen ? await userRepo.findOne({ where: { email: 'admin_hyd@ryzen.com', organizationId: ryzen.id } }) : null;
  if (ryzen && sampleUser && adminUser) {
    const existingTask = await taskRepo.findOne({ where: { organizationId: ryzen.id } });
    if (!existingTask) {
      await taskRepo.save(
        taskRepo.create({
          title: 'Review quarterly report',
          description: 'Check and sign off',
          status: 'pending',
          category: 'work',
          orderIndex: 0,
          organizationId: ryzen.id,
          createdById: adminUser.id,
          assignedToId: sampleUser.id,
        })
      );
      await taskRepo.save(
        taskRepo.create({
          title: 'Update documentation',
          status: 'in_progress',
          category: 'work',
          orderIndex: 1,
          organizationId: ryzen.id,
          createdById: adminUser.id,
          assignedToId: sampleUser.id,
        })
      );
      console.log('Created sample assigned tasks');
    }
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
