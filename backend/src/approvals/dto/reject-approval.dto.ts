import { IsString, MinLength } from 'class-validator';

export class RejectApprovalDto {
  @IsString()
  @MinLength(1)
  comment!: string;
}
