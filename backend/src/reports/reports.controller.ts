import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('performance')
  performance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.performance(startDate, endDate);
  }

  @Post('send-report')
  sendReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const today = new Date();
    const end = endDate ?? today.toISOString().slice(0, 10);
    const start = startDate ?? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return this.service.sendReportEmail(start, end, 'Rapport (envoi manuel)');
  }

  @Get('payroll')
  async payroll(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.payrollCsv(startDate, endDate);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export-paie-${startDate ?? 'periode'}.csv"`);
    res.send(csv);
  }

  @Get('payroll-breakdown')
  payrollBreakdown(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.payrollBreakdown(startDate, endDate);
  }

  @Post('payroll-breakdown/push')
  pushPayroll(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.pushPayrollToPayrollProvider(startDate, endDate);
  }
}
