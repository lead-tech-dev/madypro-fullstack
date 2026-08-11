import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlatformService } from '../platform/platform.service';
import { SitesService } from '../sites/sites.service';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformService: PlatformService,
    private readonly sitesService: SitesService,
  ) {}

  async listSites() {
    return this.prisma.site.findMany({
      where: { active: true },
      select: { id: true, name: true, address: true, latitude: true, longitude: true },
    });
  }

  async listInterventions(startDate?: string, endDate?: string, siteId?: string) {
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date();
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.intervention.findMany({
      where: { date: { gte: start, lte: end }, ...(siteId ? { siteId } : {}) },
      select: { id: true, siteId: true, date: true, startTime: true, endTime: true, status: true, type: true },
      orderBy: { date: 'asc' },
    });
  }

  async getCalendarFeed(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site introuvable');
    }
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const interventions = await this.prisma.intervention.findMany({
      where: { siteId, date: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      orderBy: { date: 'asc' },
    });
    return this.buildIcs(site.name, interventions);
  }

  private buildIcs(siteName: string, interventions: { id: string; date: Date; startTime: string; endTime: string; label: string | null; status: string }[]) {
    const toIcsDate = (dateStr: string, time: string) => {
      const [h, m] = time.split(':');
      return `${dateStr.replace(/-/g, '')}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
    };
    const events = interventions.map((intervention) => {
      const dateStr = intervention.date.toISOString().slice(0, 10);
      return [
        'BEGIN:VEVENT',
        `UID:${intervention.id}@madyproclean.com`,
        `DTSTART:${toIcsDate(dateStr, intervention.startTime)}`,
        `DTEND:${toIcsDate(dateStr, intervention.endTime)}`,
        `SUMMARY:${(intervention.label ?? 'Intervention').replace(/\n/g, ' ')} — ${siteName}`,
        `STATUS:${intervention.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
        'END:VEVENT',
      ].join('\r\n');
    });
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MadyPro Clean//Planning//FR',
      `X-WR-CALNAME:MadyPro Clean — ${siteName}`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  async getPortalSummary(token: string) {
    const portalToken = await this.platformService.resolvePortalToken(token);
    const [site, qualityScore] = await Promise.all([
      this.prisma.site.findUnique({ where: { id: portalToken.siteId } }),
      this.sitesService.getQualityScore(portalToken.siteId),
    ]);
    const recentInterventions = await this.prisma.intervention.findMany({
      where: { siteId: portalToken.siteId, date: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: 'desc' },
      take: 20,
      select: { id: true, date: true, startTime: true, endTime: true, status: true, type: true },
    });
    return {
      site: { id: site!.id, name: site!.name, address: site!.address },
      qualityScore,
      recentInterventions,
    };
  }

  async getPortalIncidents(token: string) {
    const portalToken = await this.platformService.resolvePortalToken(token);
    return this.sitesService.getIncidentTimeline(portalToken.siteId);
  }
}
