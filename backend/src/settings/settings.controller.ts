import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { UpdateAttendanceRulesDto } from './dto/update-attendance-rules.dto';
import { CreateAbsenceTypeDto } from './dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from './dto/update-absence-type.dto';
import { UpdateCompanyInfoDto } from './dto/update-company-info.dto';
import { UpdateMonthlyQuotaDto } from './dto/update-monthly-quota.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
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

  @Patch('monthly-quota')
  updateMonthlyQuota(@Body() dto: UpdateMonthlyQuotaDto) {
    return this.service.updateMonthlyQuota(dto);
  }

  @Get('company-info')
  getCompanyInfo() {
    return this.service.getCompanyInfo();
  }

  @Patch('company-info')
  updateCompanyInfo(@Body() dto: UpdateCompanyInfoDto) {
    return this.service.updateCompanyInfo(dto);
  }
}
