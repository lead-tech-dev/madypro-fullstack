import { IsIn } from 'class-validator';

export class UpdateQuoteStatusDto {
  @IsIn(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
  status!: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
}
