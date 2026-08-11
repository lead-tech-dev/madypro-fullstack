import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../database/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PrismaModule, SettingsModule, NotificationsModule, WebhooksModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
