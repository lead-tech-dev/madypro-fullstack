import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ShiftSwapsService } from './shift-swaps.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';

@UseGuards(JwtAuthGuard)
@Controller('shift-swaps')
export class ShiftSwapsController {
  constructor(private readonly shiftSwapsService: ShiftSwapsService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.shiftSwapsService.findAll(userId);
  }

  @Post()
  create(@Body() dto: CreateShiftSwapDto, @Req() req: Request) {
    return this.shiftSwapsService.create((req.user as any)?.sub, dto);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() req: Request) {
    return this.shiftSwapsService.accept(id, (req.user as any)?.sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Req() req: Request) {
    return this.shiftSwapsService.reject(id, (req.user as any)?.sub);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: Request) {
    return this.shiftSwapsService.cancel(id, (req.user as any)?.sub);
  }
}
