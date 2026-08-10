import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTemplateItemDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
