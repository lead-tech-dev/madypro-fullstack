import { IsArray, IsDateString, IsIn, IsOptional, IsString, ValidateIf, IsNotEmpty } from 'class-validator';
import type { InterventionType } from '../entities/intervention.entity';

export class CreateInterventionDto {
  @IsIn(['REGULAR', 'PUNCTUAL', 'PONCTUAL'])
  type!: InterventionType;

  @IsString()
  siteId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @ValidateIf((o) => o.type === 'PONCTUAL' || o.type === 'PUNCTUAL')
  @IsString()
  @IsNotEmpty()
  subType?: string;

  @IsArray()
  agentIds!: string[];

  @IsOptional()
  @IsArray()
  truckLabels?: string[];

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  generatedFromRuleId?: string;
}
