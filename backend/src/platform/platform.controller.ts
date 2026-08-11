import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('api-keys')
  listApiKeys() {
    return this.platformService.listApiKeys();
  }

  @Post('api-keys')
  createApiKey(@Body() dto: CreateApiKeyDto) {
    return this.platformService.createApiKey(dto);
  }

  @Delete('api-keys/:id')
  revokeApiKey(@Param('id') id: string) {
    return this.platformService.revokeApiKey(id);
  }

  @Get('portal-tokens')
  listPortalTokens(@Query('siteId') siteId?: string) {
    return this.platformService.listPortalTokens(siteId);
  }

  @Post('portal-tokens/:siteId')
  createPortalToken(@Param('siteId') siteId: string) {
    return this.platformService.createPortalToken(siteId);
  }

  @Delete('portal-tokens/:id')
  revokePortalToken(@Param('id') id: string) {
    return this.platformService.revokePortalToken(id);
  }
}
