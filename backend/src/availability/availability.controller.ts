import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('me')
  findMine(@Req() req: Request) {
    return this.availabilityService.findForUser((req.user as any)?.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.availabilityService.findAll(from, to);
  }

  @Post()
  upsert(@Body() dto: CreateAvailabilityDto, @Req() req: Request) {
    return this.availabilityService.upsert((req.user as any)?.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.availabilityService.remove(id, (req.user as any)?.sub);
  }
}
