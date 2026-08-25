import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTemplateItemDto } from './dto/create-template-item.dto';
import { SetOnboardingItemStatusDto } from './dto/set-onboarding-item-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('template')
  findTemplate() {
    return this.onboardingService.findTemplate();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('template')
  createTemplateItem(@Body() dto: CreateTemplateItemDto) {
    return this.onboardingService.createTemplateItem(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete('template/:id')
  removeTemplateItem(@Param('id') id: string) {
    return this.onboardingService.removeTemplateItem(id);
  }

  @Get('users/:userId')
  findForUser(@Param('userId') userId: string, @Req() req: Request) {
    const user = req.user as any;
    if (user?.role === 'AGENT' && user?.sub !== userId) {
      throw new ForbiddenException("Vous ne pouvez consulter que votre propre parcours d'intégration");
    }
    return this.onboardingService.findForUser(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('users/:userId/seed')
  seedForUser(@Param('userId') userId: string) {
    return this.onboardingService.seedForUser(userId);
  }

  @Patch('items/:id')
  setDone(@Param('id') id: string, @Body() dto: SetOnboardingItemStatusDto, @Req() req: Request) {
    const user = req.user as any;
    return this.onboardingService.setDone(id, dto.done, { userId: user?.sub, role: user?.role });
  }
}
