import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailerModule } from './mailer.module';
import { UsersModule } from '../users/users.module';
import { SitesModule } from '../sites/sites.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UsersModule, SitesModule, AuditModule, MailerModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService, MailerModule],
})
export class NotificationsModule {}
