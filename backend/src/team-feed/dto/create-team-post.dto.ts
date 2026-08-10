import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateTeamPostDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
