import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
    WebhooksModule,
  ],
  providers: [RealtimeService],
  controllers: [RealtimeController],
  exports: [RealtimeService],
})
export class RealtimeModule {}
