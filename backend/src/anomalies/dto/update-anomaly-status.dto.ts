import { IsIn } from 'class-validator';

export class UpdateAnomalyStatusDto {
  @IsIn(['NEW', 'RESOLVED'])
  status!: 'NEW' | 'RESOLVED';
}
