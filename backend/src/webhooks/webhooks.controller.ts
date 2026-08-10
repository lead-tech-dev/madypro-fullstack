import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { UpdateWebhookStatusDto } from './dto/update-webhook-status.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.WEBHOOKS_MANAGE)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  findAll() {
    return this.webhooksService.findAll();
  }

  @Post()
  create(@Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateWebhookStatusDto) {
    return this.webhooksService.setStatus(id, dto.active);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@Param('id') id: string) {
    return this.webhooksService.rotateSecret(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.webhooksService.remove(id);
  }
}
