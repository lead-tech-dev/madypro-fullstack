import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordInvoicePaymentDto {
  @IsNumber()
  @Min(0)
  amountPaidHT!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;
}
