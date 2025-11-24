import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ArrayMinSize } from 'class-validator';

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
  @IsBoolean()
  active?: boolean;
}
