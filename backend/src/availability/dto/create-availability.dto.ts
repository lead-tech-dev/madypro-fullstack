import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString()
  date!: string;

  @IsIn(['AVAILABLE', 'UNAVAILABLE'])
  type!: 'AVAILABLE' | 'UNAVAILABLE';

  @IsOptional()
  @IsString()
  note?: string;
}
