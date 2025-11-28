import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsOptional()
  interventionId?: string;

  @IsString()
  @IsOptional()
  attendanceId?: string;
}
