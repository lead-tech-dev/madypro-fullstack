import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, Query } from '@nestjs/common';
import { Request } from 'express';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Controller('sites')
export class SitesController {
  constructor(private readonly service: SitesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.service.findAll({
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Body() dto: CreateSiteDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSiteDto, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id/checklist')
  listChecklist(@Param('id') id: string) {
    return this.service.listChecklist(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/checklist')
  createChecklistItem(@Param('id') id: string, @Body() dto: CreateChecklistItemDto, @Req() req: Request) {
    return this.service.createChecklistItem(id, dto, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/checklist/:itemId')
  updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Req() req: Request,
  ) {
    return this.service.updateChecklistItem(id, itemId, dto, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id/checklist/:itemId')
  removeChecklistItem(@Param('id') id: string, @Param('itemId') itemId: string, @Req() req: Request) {
    return this.service.removeChecklistItem(id, itemId, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('contracts/expiring')
  findExpiringContracts(@Query('days') days?: string) {
    return this.service.findExpiringContracts(days ? Number(days) : 30);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/contracts')
  listContracts(@Param('id') id: string) {
    return this.service.listContracts(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/contracts')
  createContract(
    @Param('id') id: string,
    @Body() dto: { label: string; startDate: string; endDate: string; slaDetails?: string; documentUrl?: string },
  ) {
    return this.service.createContract(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id/contracts/:contractId')
  removeContract(@Param('id') id: string, @Param('contractId') contractId: string) {
    return this.service.removeContract(id, contractId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id/zones')
  listZones(@Param('id') id: string) {
    return this.service.listZones(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/zones')
  createZone(@Param('id') id: string, @Body() dto: { label: string; floor?: string; order?: number }) {
    return this.service.createZone(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Patch(':id/zones/:zoneId')
  updateZone(
    @Param('id') id: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: { label?: string; floor?: string; order?: number; completed?: boolean },
  ) {
    return this.service.updateZone(id, zoneId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id/zones/:zoneId')
  removeZone(@Param('id') id: string, @Param('zoneId') zoneId: string) {
    return this.service.removeZone(id, zoneId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/plan')
  setPlanImage(@Param('id') id: string, @Body() dto: { planImageUrl: string | null }) {
    return this.service.setPlanImage(id, dto.planImageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/incidents')
  getIncidentTimeline(@Param('id') id: string) {
    return this.service.getIncidentTimeline(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/quality-score')
  getQualityScore(@Param('id') id: string) {
    return this.service.getQualityScore(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/qr-code')
  getQrCode(@Param('id') id: string) {
    return this.service.getQrCode(id);
  }
}
