import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Task } from '../entities/task.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminsModule } from '../admins/admins.module';
import { PlatformModule } from '../platform/platform.module';
import { TasksModule } from '../tasks/tasks.module';
import { AuditModule } from '../audit/audit.module';
import { HealthModule } from '../health/health.module';
import { SeedOnBootstrap } from './seed-on-bootstrap';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: process.env['DB_TYPE'] === 'postgres' ? 'postgres' : 'sqlite',
      host: process.env['DB_HOST'] || undefined,
      port: process.env['DB_PORT'] ? parseInt(process.env['DB_PORT'], 10) : undefined,
      username: process.env['DB_USERNAME'] || undefined,
      password: process.env['DB_PASSWORD'] || undefined,
      database: process.env['DB_DATABASE'] || 'data/tasks.sqlite',
      entities: [User, Organization, Task, AuditLog],
      synchronize: process.env['NODE_ENV'] !== 'production',
      logging: process.env['DB_LOGGING'] === 'true',
    }),
    TypeOrmModule.forFeature([User, Organization]),
    AuthModule,
    OrganizationsModule,
    AdminsModule,
    PlatformModule,
    TasksModule,
    AuditModule,
    HealthModule,
  ],
  providers: [SeedOnBootstrap],
})
export class AppModule {}
