import { IsOptional, IsString } from 'class-validator';

export class RegisterTokenDto {
  @IsOptional()
  @IsString()
  token?: string; // compat legacy

  @IsOptional()
  @IsString()
  expoToken?: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;
}
