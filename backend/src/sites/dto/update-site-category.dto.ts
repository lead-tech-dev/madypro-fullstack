import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSiteCategoryDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
