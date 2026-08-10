import { IsBoolean } from 'class-validator';

export class SetOnboardingItemStatusDto {
  @IsBoolean()
  done!: boolean;
}
