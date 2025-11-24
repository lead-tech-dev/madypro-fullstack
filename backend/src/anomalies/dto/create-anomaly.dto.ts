import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAnomalyDto {
  @IsString()
  interventionId!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
