import { IsIn, IsOptional, IsString } from 'class-validator';
import type { NotificationAudience } from '../entities/notification.entity';

export class SendNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsIn(['ALL_AGENTS', 'SITE_AGENTS', 'AGENT'])
  audience!: NotificationAudience;

  @IsOptional()
  @IsString()
  targetId?: string;
}
