import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlatformController } from './platform.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [PlatformController],
})
export class PlatformModule {}
