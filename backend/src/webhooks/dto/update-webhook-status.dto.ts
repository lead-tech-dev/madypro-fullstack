import { IsBoolean } from 'class-validator';

export class UpdateWebhookStatusDto {
  @IsBoolean()
  active!: boolean;
}
