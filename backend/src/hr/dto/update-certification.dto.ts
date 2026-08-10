import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateCertificationDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  obtainedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
