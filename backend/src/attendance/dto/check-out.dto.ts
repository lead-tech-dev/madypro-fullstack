import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  userId!: string;

  @IsString()
  interventionId!: string;

  @IsString()
  @IsOptional()
  attendanceId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Une photo est requise pour terminer le pointage.' })
  photo!: string;
}
