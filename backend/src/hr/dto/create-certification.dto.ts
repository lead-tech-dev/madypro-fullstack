import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  userId!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsDateString()
  obtainedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
