import { IsDateString } from 'class-validator';

export class DuplicateInterventionDto {
  @IsDateString()
  date!: string;
}
