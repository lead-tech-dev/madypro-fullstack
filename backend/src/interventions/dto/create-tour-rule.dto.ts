import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class TourStopInputDto {
  @IsIn([0, 1, 2, 3, 4, 5, 6])
  dayOfWeek!: number;

  @IsString()
  siteId!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsArray()
  agentIds!: string[];

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateTourRuleDto {
  @IsString()
  label!: string;

  @IsArray()
  @ArrayMinSize(1)
  stops!: TourStopInputDto[];

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
