import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminsController } from './admins.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [AdminsController],
})
export class AdminsModule {}
