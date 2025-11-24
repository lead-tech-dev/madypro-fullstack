import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateAttendanceRulesDto } from './dto/update-attendance-rules.dto';
import { CreateAbsenceTypeDto } from './dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from './dto/update-absence-type.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('attendance-rules')
  updateAttendanceRules(@Body() dto: UpdateAttendanceRulesDto) {
    return this.service.updateAttendanceRules(dto);
  }

  @Post('absence-types')
  createAbsenceType(@Body() dto: CreateAbsenceTypeDto) {
    return this.service.createAbsenceType(dto);
  }

  @Patch('absence-types/:code')
  updateAbsenceType(@Param('code') code: string, @Body() dto: UpdateAbsenceTypeDto) {
    return this.service.updateAbsenceType(code, dto);
  }
}
