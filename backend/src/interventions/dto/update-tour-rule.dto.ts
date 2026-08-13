import { PartialType } from '@nestjs/mapped-types';
import { CreateTourRuleDto } from './create-tour-rule.dto';

export class UpdateTourRuleDto extends PartialType(CreateTourRuleDto) {}
