import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
