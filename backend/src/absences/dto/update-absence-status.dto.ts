import { IsIn, IsOptional, IsString } from 'class-validator';
import type { AbsenceStatus } from '../entities/absence.entity';

export class UpdateAbsenceStatusDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: AbsenceStatus;

  @IsString()
  validatedBy!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
