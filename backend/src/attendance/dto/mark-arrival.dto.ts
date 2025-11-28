import { IsNumber, IsOptional, IsString } from 'class-validator';

export class MarkArrivalDto {
  @IsString()
  userId!: string;

  @IsString()
  siteId!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  @IsOptional()
  interventionId?: string;
}
