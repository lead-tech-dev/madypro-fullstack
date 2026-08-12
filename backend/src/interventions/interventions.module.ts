import { Module, forwardRef } from '@nestjs/common';
import { InterventionsController } from './interventions.controller';
import { InterventionsService } from './interventions.service';
import { SitesModule } from '../sites/sites.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [
    SitesModule,
    UsersModule,
    RealtimeModule,
    NotificationsModule,
    AuditModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService],
})
export class InterventionsModule {}
