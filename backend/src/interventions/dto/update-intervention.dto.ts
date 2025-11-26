import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateInterventionDto } from './create-intervention.dto';
import { InterventionStatus } from '../entities/intervention.entity';

export class UpdateInterventionDto extends PartialType(CreateInterventionDto) {
  @IsOptional()
  @IsString()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW', 'CANCELLED', 'NO_SHOW'])
  status?: InterventionStatus;
}
