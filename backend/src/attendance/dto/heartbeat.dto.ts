import { IsString, IsNumber, IsOptional } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  userId!: string;

  @IsString()
  siteId!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  @IsOptional()
  interventionId?: string;
}
