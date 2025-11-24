import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import type { AbsenceType } from '../entities/absence.entity';

export class CreateAbsenceRequestDto {
  @IsString()
  userId!: string;

  @IsIn(['SICK', 'PAID_LEAVE', 'UNPAID', 'OTHER'])
  type!: AbsenceType;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  siteId?: string;
}
