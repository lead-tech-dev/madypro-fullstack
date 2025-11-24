import { PartialType } from '@nestjs/mapped-types';
import { CreateInterventionRuleDto } from './create-rule.dto';

export class UpdateInterventionRuleDto extends PartialType(CreateInterventionRuleDto) {}
