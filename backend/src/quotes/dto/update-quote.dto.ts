import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { LineItemDto } from '../../documents/dto/line-item.dto';

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsArray()
  lineItems?: LineItemDto[];
}
