import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  userId!: string;

  @IsString()
  siteId!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  interventionId!: string;

  @IsString()
  @IsOptional()
  attendanceId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Une photo est requise pour démarrer le pointage.' })
  photo!: string;

  @IsString()
  @IsOptional()
  qrCode?: string;
}
