import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
