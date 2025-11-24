import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateAbsenceRequestDto } from './dto/create-absence-request.dto';
import { CreateManualAbsenceDto } from './dto/create-manual-absence.dto';
import { UpdateAbsenceStatusDto } from './dto/update-absence-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('absences')
export class AbsencesController {
  constructor(private readonly service: AbsencesService) {}

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get()
  list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('agentId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    const viewer = req.user;
    const enforcedUserId = viewer?.role === 'AGENT' ? viewer.sub : userId;
    return this.service.list({
      status: (status as any) ?? 'all',
      type: (type as any) ?? 'all',
      userId: enforcedUserId,
      startDate,
      endDate,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    const absence = await this.service.detail(id);
    if (req.user?.role === 'AGENT' && absence.agent.id !== req.user.sub) {
      throw new ForbiddenException('Accès refusé');
    }
    return absence;
  }

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Post('request')
  request(@Body() body: CreateAbsenceRequestDto) {
    return this.service.request(body);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Post('manual')
  createManual(@Body() body: CreateManualAbsenceDto) {
    return this.service.createManual(body);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateAbsenceStatusDto) {
    return this.service.updateStatus(id, body);
  }
}
