import { IsIn } from 'class-validator';

export class UpdateInvoiceStatusDto {
  @IsIn(['DRAFT', 'SENT', 'PAID', 'CANCELLED'])
  status!: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
}
