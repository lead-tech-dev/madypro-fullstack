import { IsIn } from 'class-validator';

export class UpdateQuoteStatusDto {
  @IsIn(['DRAFT', 'SENT', 'PAID', 'CANCELLED'])
  status!: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
}
