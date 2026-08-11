import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('public-api')
@Controller('public-api')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @UseGuards(ApiKeyGuard)
  @Get('sites')
  listSites() {
    return this.publicApiService.listSites();
  }

  @UseGuards(ApiKeyGuard)
  @Get('interventions')
  listInterventions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.publicApiService.listInterventions(startDate, endDate, siteId);
  }

  @UseGuards(ApiKeyGuard)
  @Get('calendar/:siteId')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  getCalendarFeed(@Param('siteId') siteId: string) {
    return this.publicApiService.getCalendarFeed(siteId);
  }

  @Get('portal/:token')
  getPortalSummary(@Param('token') token: string) {
    return this.publicApiService.getPortalSummary(token);
  }

  @Get('portal/:token/incidents')
  getPortalIncidents(@Param('token') token: string) {
    return this.publicApiService.getPortalIncidents(token);
  }
}
