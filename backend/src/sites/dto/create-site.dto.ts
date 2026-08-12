import { IsArray, IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  timeWindow?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supervisorIds?: string[];

  @IsOptional()
  @IsString()
  accessInstructions?: string;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsNumber()
  gpsDistanceMeters?: number;

  @IsOptional()
  @IsNumber()
  toleranceMinutes?: number;

  @IsOptional()
  @IsNumber()
  minimumDurationMinutes?: number;
}
