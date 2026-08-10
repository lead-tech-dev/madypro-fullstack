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
}
