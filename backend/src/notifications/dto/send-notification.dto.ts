import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
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

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalateAfterMinutes?: number;
}
