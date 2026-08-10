import { IsOptional, IsString } from 'class-validator';

export class CreateShiftSwapDto {
  @IsString()
  interventionId!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
