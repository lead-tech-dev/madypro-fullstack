import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SendNotificationDto } from './dto/send-notification.dto';
import { RegisterTokenDto } from './dto/register-token.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { Query } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  list(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.service.list(parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get('feed')
  feed(@Req() req: any) {
    return this.service.feed(req.user);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  send(@Body() dto: SendNotificationDto) {
    return this.service.send(dto);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Post('register-token')
  registerToken(@Req() req: any, @Body() dto: RegisterTokenDto) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.service.registerToken(userId, dto.expoToken || dto.token, dto.deviceToken);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.service.markRead(id, userId);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/read-stats')
  getReadStats(@Param('id') id: string) {
    return this.service.getReadStats(id);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('templates/list')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Post('templates')
  createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Roles('ADMIN')
  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.service.removeTemplate(id);
  }
}
