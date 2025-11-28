import { IsOptional, IsString, IsIn } from 'class-validator';
import type { AttendanceStatus } from '../entities/attendance.entity';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED', 'CANCELLED'])
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  interventionId?: string;
}
