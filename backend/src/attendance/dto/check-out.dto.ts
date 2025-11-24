import { IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  userId!: string;
}
