import { Body, Controller, Get, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  summary(@Query('date') date?: string) {
    return this.service.summary(date);
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

  @Get('hours-quota')
  @Roles('ADMIN', 'SUPERVISOR')
  hoursQuota(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
  ) {
    const user = req.user as any;
    return this.service.hoursQuota(startDate, endDate, {
      siteId,
      requesterId: user?.sub,
      requesterRole: user?.role,
    });
  }

  @Get('hours-quota/pdf')
  @Roles('ADMIN', 'SUPERVISOR')
  async hoursQuotaPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
  ) {
    const user = req.user as any;
    const report = await this.service.hoursQuota(startDate, endDate, {
      siteId,
      requesterId: user?.sub,
      requesterRole: user?.role,
    });
    const buffer = await this.service.hoursQuotaPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quota-heures-${report.period.startDate}.pdf"`);
    res.send(buffer);
  }

  @Get('comparison')
  comparePeriods(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.comparePeriods(startDate, endDate);
  }

  @Get('site-benchmark')
  getSiteBenchmark(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getSiteBenchmark(startDate, endDate);
  }

  @Get('billing')
  getBillingReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getBillingReport(startDate, endDate);
  }

  @Get('invoicing')
  getInvoicingReport() {
    return this.service.getInvoicingReport();
  }

  @Get('dashboard-layout')
  getDashboardLayout(@Req() req: Request) {
    return this.service.getDashboardLayout((req.user as any)?.sub);
  }

  @Put('dashboard-layout')
  setDashboardLayout(@Req() req: Request, @Body() body: { layout: unknown }) {
    return this.service.setDashboardLayout((req.user as any)?.sub, body.layout);
  }
}
