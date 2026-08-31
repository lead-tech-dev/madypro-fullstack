import { IsInt, Max, Min } from 'class-validator';

export class UpdateMonthlyQuotaDto {
  @IsInt()
  @Min(1)
  @Max(100)
  accomplishmentThresholdPercent!: number;
}
