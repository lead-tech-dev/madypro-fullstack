import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { AwardBadgeDto } from './dto/award-badge.dto';

@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  findBadges() {
    return this.badgesService.findBadges();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  createBadge(@Body() dto: CreateBadgeDto) {
    return this.badgesService.createBadge(dto);
  }

  @Get('awards')
  findAwards(@Query('userId') userId?: string) {
    return this.badgesService.findAwards(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('awards')
  award(@Body() dto: AwardBadgeDto, @Req() req: Request) {
    return this.badgesService.award((req.user as any)?.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete('awards/:id')
  revoke(@Param('id') id: string) {
    return this.badgesService.revoke(id);
  }
}
