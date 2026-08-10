import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [SettingsController],
  providers: [SettingsService, PermissionsGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
