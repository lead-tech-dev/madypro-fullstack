import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class LineItemDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPriceHT!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRatePercent?: number;
}
