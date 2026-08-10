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
          site: { include: { supervisors: { include: { user: true } } } },
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

  async performance(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const period = {
      startDate: startDate ?? defaultStart,
      endDate: endDate ?? defaultEnd,
    };

    const start = this.startOfDay(new Date(period.startDate));
    const end = this.endOfDay(new Date(period.endDate));

    const [attendances, absences, interventions] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { date: { gte: start, lte: end } },
        include: { user: true, intervention: { include: { site: true } } },
      }),
      this.prisma.absence.findMany({
        where: { from: { lte: end }, to: { gte: start } },
        include: { user: true },
      }),
      this.prisma.intervention.findMany({
        where: { date: { gte: start, lte: end } },
        include: { site: true },
      }),
    ]);

    const minutesBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 60000);

    type AgentAgg = {
      id: string;
      name: string;
      totalMinutes: number;
      workingDays: Set<string>;
      absenceMinutes: number;
    };
    const agentMap = new Map<string, AgentAgg>();
    const ensureAgent = (id: string, name: string) => {
      let agent = agentMap.get(id);
      if (!agent) {
        agent = { id, name, totalMinutes: 0, workingDays: new Set(), absenceMinutes: 0 };
        agentMap.set(id, agent);
      }
      return agent;
    };

    attendances.forEach((att) => {
      if (!att.checkInTime) return;
      const agent = ensureAgent(att.userId, `${att.user.firstName} ${att.user.lastName}`.trim());
      agent.workingDays.add(att.date.toISOString().slice(0, 10));
      if (att.checkOutTime) {
        agent.totalMinutes += minutesBetween(new Date(att.checkInTime), new Date(att.checkOutTime));
      }
    });

    absences.forEach((abs) => {
      const agent = ensureAgent(abs.userId, `${abs.user.firstName} ${abs.user.lastName}`.trim());
      const from = abs.from > start ? abs.from : start;
      const to = abs.to < end ? abs.to : end;
      agent.absenceMinutes += minutesBetween(new Date(from), new Date(to));
    });

    const agentReports = Array.from(agentMap.values())
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        totalMinutes: Math.round(agent.totalMinutes),
        workingDays: agent.workingDays.size,
        absenceMinutes: Math.round(agent.absenceMinutes),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    type SiteAgg = {
      id: string;
      name: string;
      totalMinutes: number;
      agents: Set<string>;
      days: Set<string>;
      coveredDays: Set<string>;
    };
    const siteMap = new Map<string, SiteAgg>();
    const ensureSite = (id: string, name: string) => {
      let site = siteMap.get(id);
      if (!site) {
        site = { id, name, totalMinutes: 0, agents: new Set(), days: new Set(), coveredDays: new Set() };
        siteMap.set(id, site);
      }
      return site;
    };

    interventions.forEach((intervention) => {
      const site = ensureSite(intervention.siteId, intervention.site.name);
      site.days.add(intervention.date.toISOString().slice(0, 10));
    });

    attendances.forEach((att) => {
      if (!att.checkInTime) return;
      const site = ensureSite(att.intervention.siteId, att.intervention.site.name);
      site.agents.add(`${att.user.firstName} ${att.user.lastName}`.trim());
      site.coveredDays.add(att.date.toISOString().slice(0, 10));
      if (att.checkOutTime) {
        site.totalMinutes += minutesBetween(new Date(att.checkInTime), new Date(att.checkOutTime));
      }
    });

    const siteReports = Array.from(siteMap.values())
      .map((site) => ({
        id: site.id,
        name: site.name,
        totalMinutes: Math.round(site.totalMinutes),
        agents: Array.from(site.agents),
        uncoveredDays: Array.from(site.days).filter((day) => !site.coveredDays.has(day)).length,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    const totalMinutes = agentReports.reduce((sum, agent) => sum + agent.totalMinutes, 0);

    return {
      period,
      agentReports,
      siteReports,
      totals: { totalMinutes },
    };
  }

  private isoWeekKey(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * Export paie : heures normales / majorées par agent et par semaine ISO,
   * seuil légal de 35h/semaine, en CSV.
   */
  async payrollCsv(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const period = { startDate: startDate ?? defaultStart, endDate: endDate ?? defaultEnd };
    const start = this.startOfDay(new Date(period.startDate));
    const end = this.endOfDay(new Date(period.endDate));

    const attendances = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lte: end }, checkInTime: { not: null }, checkOutTime: { not: null } },
      include: { user: true },
    });

    const LEGAL_WEEKLY_MINUTES = 35 * 60;
    type WeekAgg = { agentName: string; agentEmail: string; minutes: number };
    const byAgentWeek = new Map<string, WeekAgg>();

    attendances.forEach((att) => {
      if (!att.checkInTime || !att.checkOutTime) return;
      const minutes = Math.max(0, (att.checkOutTime.getTime() - att.checkInTime.getTime()) / 60000);
      const week = this.isoWeekKey(att.date);
      const key = `${att.userId}::${week}`;
      const existing = byAgentWeek.get(key);
      if (existing) {
        existing.minutes += minutes;
      } else {
        byAgentWeek.set(key, {
          agentName: `${att.user.firstName} ${att.user.lastName}`.trim(),
          agentEmail: att.user.email,
          minutes,
        });
      }
    });

    const rows = Array.from(byAgentWeek.entries())
      .map(([key, agg]) => {
        const [, week] = key.split('::');
        const normalMinutes = Math.min(agg.minutes, LEGAL_WEEKLY_MINUTES);
        const overtimeMinutes = Math.max(0, agg.minutes - LEGAL_WEEKLY_MINUTES);
        return {
          agentName: agg.agentName,
          agentEmail: agg.agentEmail,
          week,
          normalHours: Math.round((normalMinutes / 60) * 100) / 100,
          overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
          totalHours: Math.round((agg.minutes / 60) * 100) / 100,
        };
      })
      .sort((a, b) => a.agentName.localeCompare(b.agentName) || a.week.localeCompare(b.week));

    const header = 'Agent;Email;Semaine;Heures normales;Heures majorées;Total heures';
    const lines = rows.map(
      (r) =>
        `${r.agentName};${r.agentEmail};${r.week};${r.normalHours.toFixed(2)};${r.overtimeHours.toFixed(2)};${r.totalHours.toFixed(2)}`,
    );
    return [header, ...lines].join('\n');
  }
}
