import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, ArrayMinSize, Min } from 'class-validator';

export class CreateInterventionRuleDto {
  @IsString()
  siteId!: string;

  @IsArray()
  agentIds!: string[];

  @IsString()
  label!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  daysOfWeek!: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalWeeks?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
