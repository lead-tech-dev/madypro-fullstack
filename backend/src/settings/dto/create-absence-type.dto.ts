import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAbsenceTypeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
