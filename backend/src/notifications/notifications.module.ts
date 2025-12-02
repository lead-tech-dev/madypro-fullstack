import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailerService } from './mailer.service';
import { UsersModule } from '../users/users.module';
import { SitesModule } from '../sites/sites.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UsersModule, SitesModule, AuditModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailerService],
  exports: [NotificationsService, MailerService],
})
export class NotificationsModule {}
