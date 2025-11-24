import { IsInt, IsMilitaryTime, IsString, Max, Min } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  userId!: string;

  @IsString()
  siteId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsMilitaryTime()
  startTime!: string;

  @IsMilitaryTime()
  endTime!: string;
}
