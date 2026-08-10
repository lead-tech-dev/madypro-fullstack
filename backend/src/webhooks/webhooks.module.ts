import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Module({
  imports: [UsersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PermissionsGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
