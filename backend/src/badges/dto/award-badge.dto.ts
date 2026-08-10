import { IsOptional, IsString } from 'class-validator';

export class AwardBadgeDto {
  @IsString()
  userId!: string;

  @IsString()
  badgeId!: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
