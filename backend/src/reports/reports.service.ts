import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private combine(dateStr: string, time: string) {
    return new Date(`${dateStr}T${time}:00`);
  }

  async summary() {
    const today = new Date();
    const defaultDate = today.toISOString().substring(0, 10);
    const start = this.startOfDay(today);
    const end = this.endOfDay(today);

    const [interventions, attendance] = await Promise.all([
      this.prisma.intervention.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          assignments: { include: { user: true } },
          site: { include: { client: true, supervisors: { include: { user: true } } } },
        },
      }),
      this.prisma.attendance.findMany({
        where: { date: { gte: start, lte: end } },
        include: { user: true, intervention: { include: { site: true } } },
      }),
    ]);

    const attendanceMap = new Map<string, { checkIn?: string; status?: string }>();
    attendance.forEach((att) => {
      const siteId = (att as any).intervention?.siteId;
      if (!att.userId || !siteId) return;
      const key = `${att.userId}::${siteId}`;
      const checkIn = att.checkInTime ? new Date(att.checkInTime).toISOString().slice(11, 16) : undefined;
      const status = att.status;
      attendanceMap.set(key, { checkIn, status });
    });

    const planning = interventions.flatMap((intervention) => {
      const siteName = intervention.site.name;
      const supervisors = intervention.site.supervisors.map((s) => `${s.user.firstName} ${s.user.lastName}`.trim());
      return intervention.assignments.map((assign) => {
        const agent = `${assign.user.firstName} ${assign.user.lastName}`.trim();
        const key = `${assign.userId}::${intervention.siteId}`;
        const attendanceInfo = attendanceMap.get(key);
        const plannedStart = this.combine(intervention.date.toISOString().slice(0, 10), intervention.startTime);
        const status =
          attendanceInfo?.status === 'CANCELLED'
            ? 'ABSENT'
            : attendanceInfo?.checkIn
            ? new Date(`${defaultDate}T${attendanceInfo.checkIn}:00`) > plannedStart
              ? 'LATE'
              : 'ON_TIME'
            : 'ABSENT';
        return {
          id: `${intervention.id}-${assign.userId}`,
          agent,
          supervisor: supervisors.join(', ') || '—',
          site: siteName,
          planned: true,
          checkIn: attendanceInfo?.checkIn,
          status,
        };
      });
    });

    const filterOptions = {
      sites: Array.from(new Set(planning.map((p) => p.site))),
      supervisors: Array.from(new Set(planning.map((p) => p.supervisor).filter(Boolean))),
    };

    const alerts = planning
      .filter((p) => p.status === 'ABSENT')
      .slice(0, 3)
      .map((p, idx) => ({
        id: `alert-${idx}`,
        type: 'Absence',
        description: `${p.agent} · ${p.site}`,
        severity: 'warning',
      }));

    const metrics = [
      { title: 'Agents planifiés', value: planning.filter((record) => record.planned).length },
      { title: 'Agents pointés', value: planning.filter((record) => record.checkIn).length },
      { title: 'Agents absents', value: planning.filter((record) => record.status === 'ABSENT').length },
      {
        title: 'Sites impactés',
        value: new Set(planning.filter((record) => record.status === 'ABSENT').map((record) => record.site)).size,
      },
    ];

    return {
      defaultDate,
      filterOptions,
      metrics,
      planning,
      alerts,
    };
  }

  performance(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const period = {
      startDate: startDate ?? defaultStart,
      endDate: endDate ?? defaultEnd,
    };

    const agentReports = [
      {
        id: '3',
        name: 'Lucas Pereira',
        totalMinutes: 1980,
        workingDays: 9,
        absenceMinutes: 240,
      },
      {
        id: '5',
        name: 'Imen Rami',
        totalMinutes: 1680,
        workingDays: 8,
        absenceMinutes: 0,
      },
      {
        id: '4',
        name: 'Valérie Masson',
        totalMinutes: 1440,
        workingDays: 7,
        absenceMinutes: 360,
      },
    ];

    const siteReports = [
      {
        id: 'site-atelier',
        name: 'Atelier Genève',
        totalMinutes: 2100,
        agents: ['Lucas Pereira', 'Valérie Masson'],
        uncoveredDays: 0,
      },
      {
        id: 'site-viva',
        name: 'Siège Viva Retail',
        totalMinutes: 1680,
        agents: ['Imen Rami'],
        uncoveredDays: 1,
      },
      {
        id: 'site-terrasse',
        name: 'Terrasse Lémanique',
        totalMinutes: 960,
        agents: ['Valérie Masson'],
        uncoveredDays: 2,
      },
    ];

    const totalMinutes = agentReports.reduce((sum, agent) => sum + agent.totalMinutes, 0);

    const totals = {
      totalMinutes,
    };

    return {
      period,
      agentReports,
      siteReports,
      totals,
    };
  }
}
