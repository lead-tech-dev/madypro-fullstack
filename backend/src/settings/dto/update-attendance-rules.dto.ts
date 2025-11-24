import { IsInt, Min } from 'class-validator';

export class UpdateAttendanceRulesDto {
  @IsInt()
  @Min(10)
  gpsDistanceMeters!: number;

  @IsInt()
  @Min(0)
  toleranceMinutes!: number;

  @IsInt()
  @Min(1)
  minimumDurationMinutes!: number;
}
