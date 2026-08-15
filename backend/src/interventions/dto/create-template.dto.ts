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

export class TemplateStopInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  daysOfWeek!: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalWeeks?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

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

export class CreateTemplateDto {
  @IsString()
  label!: string;

  @IsString()
  siteId!: string;

  @IsArray()
  @ArrayMinSize(1)
  stops!: TemplateStopInputDto[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
