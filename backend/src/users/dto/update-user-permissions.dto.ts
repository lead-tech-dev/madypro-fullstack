import { IsArray, IsIn } from 'class-validator';
import { ALL_PERMISSIONS } from '../../common/constants/permissions';

export class UpdateUserPermissionsDto {
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions!: string[];
}
