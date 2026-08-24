import { Module } from '@nestjs/common';
import { ShiftSwapsController } from './shift-swaps.controller';
import { ShiftSwapsService } from './shift-swaps.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, UsersModule],
  controllers: [ShiftSwapsController],
  providers: [ShiftSwapsService],
})
export class ShiftSwapsModule {}
