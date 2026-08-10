import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TeamFeedService } from './team-feed.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTeamPostDto } from './dto/create-team-post.dto';

@UseGuards(JwtAuthGuard)
@Controller('team-feed')
export class TeamFeedController {
  constructor(private readonly teamFeedService: TeamFeedService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.teamFeedService.findAll(page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Post()
  create(@Body() dto: CreateTeamPostDto, @Req() req: Request) {
    return this.teamFeedService.create((req.user as any)?.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.teamFeedService.remove(id, user?.sub, user?.role);
  }
}
