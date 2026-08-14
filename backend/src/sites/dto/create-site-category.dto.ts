import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSiteCategoryDto {
  @IsString()
  categoryId!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
