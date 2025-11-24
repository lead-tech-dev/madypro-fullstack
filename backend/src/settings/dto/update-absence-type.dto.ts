import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAbsenceTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
