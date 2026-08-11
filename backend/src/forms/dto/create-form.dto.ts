import { IsArray, IsString } from 'class-validator';

export class CreateFormDto {
  @IsString()
  name!: string;

  @IsArray()
  fields!: Array<{ key: string; label: string; type: string; required?: boolean }>;
}
