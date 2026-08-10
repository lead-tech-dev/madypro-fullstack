import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
@Controller()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('certifications')
  findCertifications(@Query('userId') userId?: string) {
    return this.hrService.findCertifications(userId);
  }

  @Get('certifications/expiring')
  findExpiringCertifications(@Query('days') days?: string) {
    return this.hrService.findExpiringCertifications(days ? Number(days) : 30);
  }

  @Post('certifications')
  createCertification(@Body() dto: CreateCertificationDto) {
    return this.hrService.createCertification(dto);
  }

  @Patch('certifications/:id')
  updateCertification(@Param('id') id: string, @Body() dto: UpdateCertificationDto) {
    return this.hrService.updateCertification(id, dto);
  }

  @Delete('certifications/:id')
  removeCertification(@Param('id') id: string) {
    return this.hrService.removeCertification(id);
  }

  @Get('employee-documents')
  findDocuments(@Query('userId') userId?: string) {
    return this.hrService.findDocuments(userId);
  }

  @Post('employee-documents')
  createDocument(@Body() dto: CreateEmployeeDocumentDto) {
    return this.hrService.createDocument(dto);
  }

  @Delete('employee-documents/:id')
  removeDocument(@Param('id') id: string) {
    return this.hrService.removeDocument(id);
  }
}
