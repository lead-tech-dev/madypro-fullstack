import { IsInt } from 'class-validator';

export class AdjustInventoryItemDto {
  @IsInt()
  delta!: number;
}
