import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
