import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  interventionId?: string;

  @IsString()
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
