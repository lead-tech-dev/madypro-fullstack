import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateManualAttendanceDto } from './dto/create-manual.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CancelAttendanceDto } from './dto/cancel-attendance.dto';
import { MarkArrivalDto } from './dto/mark-arrival.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  list(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('agentId') userId?: string,
    @Query('siteId') siteId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.service.list({
      startDate,
      endDate,
      userId,
      siteId,
      clientId,
      status: (status as any) ?? 'all',
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Post('manual')
  createManual(@Req() req: any, @Body() dto: CreateManualAttendanceDto) {
    const userId = req.user?.sub ?? req.user?.id;
    const role = req.user?.role ?? 'SUPERVISOR';
    return this.service.createManual({ ...dto, createdByUserId: userId, createdBy: role });
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelAttendanceDto) {
    return this.service.cancel(id, dto);
  }

  @Roles('AGENT', 'ADMIN', 'SUPERVISOR')
  @Post('check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.service.checkIn(dto);
  }

  @Roles('AGENT', 'ADMIN', 'SUPERVISOR')
  @Post('arrival')
  markArrival(@Body() dto: MarkArrivalDto) {
    return this.service.markArrival(dto);
  }

  @Roles('AGENT', 'ADMIN', 'SUPERVISOR')
  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto) {
    return this.service.checkOut(dto);
  }

  @Roles('AGENT', 'ADMIN', 'SUPERVISOR')
  @Post('heartbeat')
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.service.heartbeat(dto);
  }
}
