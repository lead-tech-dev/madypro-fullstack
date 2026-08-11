import { IsString, MinLength } from 'class-validator';

export class SetSignatureDto {
  @IsString()
  @MinLength(10)
  signature!: string;
}
