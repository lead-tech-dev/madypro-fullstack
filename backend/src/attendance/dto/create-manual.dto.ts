import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateManualAttendanceDto {
  @IsString()
  userId!: string;

  @IsString()
  siteId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  checkInTime!: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsString()
  @IsNotEmpty({ message: "L'intervention est requise pour un pointage manuel." })
  interventionId!: string;

  @IsString()
  note!: string;

  @IsOptional()
  @IsIn(['ADMIN', 'SUPERVISOR'])
  createdBy?: 'ADMIN' | 'SUPERVISOR';

  @IsOptional()
  @IsString()
  createdByUserId?: string;
}
