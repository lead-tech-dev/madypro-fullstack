import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { LineItemDto } from '../../documents/dto/line-item.dto';

export class CreateInvoiceDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsString()
  label!: string;

  @IsString()
  clientName!: string;

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

  @IsArray()
  lineItems!: LineItemDto[];
}
