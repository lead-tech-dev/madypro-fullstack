import { IsIn, IsString } from 'class-validator';

const TYPES = ['CONTRACT', 'BADGE', 'LICENSE', 'OTHER'];

export class CreateEmployeeDocumentDto {
  @IsString()
  userId!: string;

  @IsIn(TYPES)
  type!: 'CONTRACT' | 'BADGE' | 'LICENSE' | 'OTHER';

  @IsString()
  label!: string;

  @IsString()
  fileUrl!: string;
}
