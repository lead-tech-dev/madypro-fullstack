import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MailerService } from '../notifications/mailer.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { computeTotals } from '../documents/line-items.util';

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);
  private lastWeeklySent: string | null = null;
  private lastMonthlySent: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly mailer: MailerService,
    private readonly webhooksService: WebhooksService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.checkScheduledReports().catch((err) =>
        this.logger.warn(`Erreur envoi programmé des rapports: ${err?.message || err}`),
      );
    }, 60 * 60 * 1000); // toutes les heures
  }

  private async checkScheduledReports() {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 8) return;

    const isoWeek = this.isoWeekKey(now);
    if (now.getDay() === 1 && this.lastWeeklySent !== isoWeek) {
      this.lastWeeklySent = isoWeek;
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await this.sendReportEmail(start, end, 'Rapport hebdomadaire');
    }

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (now.getDate() === 1 && this.lastMonthlySent !== monthKey) {
      this.lastMonthlySent = monthKey;
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await this.sendReportEmail(start, end, 'Rapport mensuel');
    }
  }

  async sendReportEmail(
    startDate: string,
    endDate: string,
    label = 'Rapport',
  ): Promise<{ recipients: number; sent: number; failed: number }> {
    const [report, csv, admins] = await Promise.all([
      this.performance(startDate, endDate),
      this.payrollCsv(startDate, endDate),
      this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPERVISOR'] }, active: true } }),
    ]);

    const html = `
      <h2>${label} — ${startDate} au ${endDate}</h2>
      <p>Heures réalisées : ${(report.kpis.realizedMinutes / 60).toFixed(1)} h
        (planifiées : ${(report.kpis.plannedMinutes / 60).toFixed(1)} h,
        taux de réalisation : ${report.kpis.realizationRate ?? '—'}%)</p>
      <p>Ponctualité : ${report.kpis.punctualityRate ?? '—'}%</p>
      <p>Absentéisme : ${report.kpis.absenteeismRate ?? '—'}%</p>
      <p>${report.agentReports.length} agent(s) actif(s) sur la période, ${report.siteReports.length} site(s) couvert(s).</p>
      <p>Le détail heures normales/majorées par agent est joint en pièce attachée.</p>
    `;

    const results = await Promise.all(
      admins.map((admin) =>
        this.mailer
          .send(admin.email, `${label} Madypro Clean — ${startDate} au ${endDate}`, html, {
            filename: `export-paie-${startDate}-${endDate}.csv`,
            content: csv,
          })
          .then(() => true)
          .catch((err) => {
            this.logger.warn(`Envoi rapport échoué pour ${admin.email}: ${err?.message || err}`);
            return false;
          }),
      ),
    );

    const sent = results.filter(Boolean).length;
    return { recipients: admins.length, sent, failed: admins.length - sent };
  }

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
      // toISOString().slice(11, 16) renverrait l'heure UTC brute (décalée vs l'heure de Paris affichée
      // partout ailleurs, cf. attendance.service.ts#formatTime) — même correctif ici.
      const checkIn = att.checkInTime
        ? new Date(att.checkInTime).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
        : undefined;
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
        include: { site: true, assignments: true },
      }),
    ]);

    const toleranceMinutes = this.settingsService.getSettings().attendanceRules.toleranceMinutes ?? 10;

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
    const totalAbsenceMinutes = agentReports.reduce((sum, agent) => sum + agent.absenceMinutes, 0);

    // Ponctualité : part des pointages démarrés dans la tolérance du planning
    const startedAttendances = attendances.filter((att) => att.checkInTime && att.plannedStart);
    const onTimeAttendances = startedAttendances.filter((att) => {
      const graceMs = toleranceMinutes * 60 * 1000;
      return att.checkInTime!.getTime() <= att.plannedStart!.getTime() + graceMs;
    });
    const punctualityRate = startedAttendances.length
      ? Math.round((onTimeAttendances.length / startedAttendances.length) * 1000) / 10
      : null;

    // Absentéisme : part du temps suivi (travaillé + absent) passée en absence
    const trackedMinutes = totalMinutes + totalAbsenceMinutes;
    const absenteeismRate = trackedMinutes ? Math.round((totalAbsenceMinutes / trackedMinutes) * 1000) / 10 : null;

    // Heures réalisées vs planifiées : durée des interventions × nombre d'agents assignés
    const plannedMinutes = interventions.reduce((sum, intervention) => {
      const durationMinutes = minutesBetween(
        this.combine(intervention.date.toISOString().slice(0, 10), intervention.startTime),
        this.combine(intervention.date.toISOString().slice(0, 10), intervention.endTime),
      );
      return sum + durationMinutes * intervention.assignments.length;
    }, 0);
    const realizationRate = plannedMinutes ? Math.round((totalMinutes / plannedMinutes) * 1000) / 10 : null;

    return {
      period,
      agentReports,
      siteReports,
      totals: { totalMinutes },
      kpis: {
        punctualityRate,
        absenteeismRate,
        plannedMinutes: Math.round(plannedMinutes),
        realizedMinutes: Math.round(totalMinutes),
        realizationRate,
      },
    };
  }

  async comparePeriods(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const currentStart = startDate ?? defaultStart;
    const currentEnd = endDate ?? defaultEnd;

    const durationMs = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
    const previousEnd = new Date(new Date(currentStart).getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    const [current, previous] = await Promise.all([
      this.performance(currentStart, currentEnd),
      this.performance(previousStart.toISOString().slice(0, 10), previousEnd.toISOString().slice(0, 10)),
    ]);

    const percentDelta = (curr: number | null, prev: number | null) => {
      if (curr == null || prev == null || prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    return {
      current: { period: current.period, kpis: current.kpis, totals: current.totals },
      previous: { period: previous.period, kpis: previous.kpis, totals: previous.totals },
      deltas: {
        punctualityRate: percentDelta(current.kpis.punctualityRate, previous.kpis.punctualityRate),
        absenteeismRate: percentDelta(current.kpis.absenteeismRate, previous.kpis.absenteeismRate),
        realizationRate: percentDelta(current.kpis.realizationRate, previous.kpis.realizationRate),
        realizedMinutes: percentDelta(current.kpis.realizedMinutes, previous.kpis.realizedMinutes),
      },
    };
  }

  async getSiteBenchmark() {
    const sites = await this.prisma.site.findMany({ where: { active: true } });
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const results = await Promise.all(
      sites.map(async (site) => {
        const [interventions, anomalies] = await Promise.all([
          this.prisma.intervention.findMany({
            where: { siteId: site.id, date: { gte: since }, status: { in: ['COMPLETED', 'NEEDS_REVIEW', 'NO_SHOW'] } },
            select: { status: true },
          }),
          this.prisma.anomaly.count({ where: { intervention: { siteId: site.id }, createdAt: { gte: since } } }),
        ]);
        const total = interventions.length;
        const completed = interventions.filter((i) => i.status === 'COMPLETED').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : null;
        return {
          siteId: site.id,
          siteName: site.name,
          interventionsTotal: total,
          completionRate,
          anomalyCount: anomalies,
        };
      }),
    );
    return results
      .filter((r) => r.interventionsTotal > 0)
      .sort((a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0));
  }

  async getBillingReport(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const start = this.startOfDay(new Date(startDate ?? defaultStart));
    const end = this.endOfDay(new Date(endDate ?? defaultEnd));

    const attendances = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lte: end }, checkInTime: { not: null }, checkOutTime: { not: null } },
      include: { intervention: { select: { billable: true, siteId: true, site: { select: { name: true } } } } },
    });

    type Agg = { siteName: string; billableMinutes: number; internalMinutes: number };
    const bySite = new Map<string, Agg>();
    attendances.forEach((att) => {
      const minutes = (att.checkOutTime!.getTime() - att.checkInTime!.getTime()) / 60000;
      const siteId = att.intervention.siteId;
      const existing = bySite.get(siteId) ?? { siteName: att.intervention.site.name, billableMinutes: 0, internalMinutes: 0 };
      if (att.intervention.billable) {
        existing.billableMinutes += minutes;
      } else {
        existing.internalMinutes += minutes;
      }
      bySite.set(siteId, existing);
    });

    const toHours = (m: number) => Math.round((m / 60) * 100) / 100;
    return Array.from(bySite.entries()).map(([siteId, agg]) => ({
      siteId,
      siteName: agg.siteName,
      billableHours: toHours(agg.billableMinutes),
      internalHours: toHours(agg.internalMinutes),
    }));
  }

  async getInvoicingReport() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoicesThisMonth, sentInvoices, quotesThisMonth] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { issuedAt: { gte: monthStart } },
        include: { lineItems: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'SENT' },
        include: { lineItems: true },
      }),
      this.prisma.quote.findMany({
        where: { issuedAt: { gte: monthStart } },
        select: { id: true, status: true },
      }),
    ]);

    const invoiceTotal = (inv: { lineItems: { quantity: number; unitPriceHT: number; vatRatePercent: number }[] }) =>
      computeTotals(inv.lineItems).totalTTC;

    const revenueThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + invoiceTotal(inv), 0);

    let pendingAmount = 0;
    let overdueAmount = 0;
    for (const inv of sentInvoices) {
      const outstanding = invoiceTotal(inv) - inv.amountPaidHT;
      if (inv.dueAt && inv.dueAt < now) {
        overdueAmount += outstanding;
      } else {
        pendingAmount += outstanding;
      }
    }

    const decidedQuotes = quotesThisMonth.filter((q) => q.status === 'ACCEPTED' || q.status === 'REJECTED').length;
    const acceptedQuotes = quotesThisMonth.filter((q) => q.status === 'ACCEPTED').length;
    const conversionRate = decidedQuotes ? Math.round((acceptedQuotes / decidedQuotes) * 100) : null;

    const round2 = (v: number) => Math.round(v * 100) / 100;
    return {
      revenueThisMonth: round2(revenueThisMonth),
      pendingAmount: round2(pendingAmount),
      overdueAmount: round2(overdueAmount),
      conversionRate,
      quotesThisMonth: quotesThisMonth.length,
    };
  }

  async getDashboardLayout(userId: string) {
    const layout = await this.prisma.userDashboardLayout.findUnique({ where: { userId } });
    return layout?.layout ?? null;
  }

  async setDashboardLayout(userId: string, layout: unknown) {
    return this.prisma.userDashboardLayout.upsert({
      where: { userId },
      update: { layout: layout as any },
      create: { userId, layout: layout as any },
    });
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

  private getEasterSunday(year: number): Date {
    // Algorithme de Gauss (calendrier grégorien)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
  }

  private getFrenchPublicHolidays(year: number): Set<string> {
    const easter = this.getEasterSunday(year);
    const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);
    const dates = [
      new Date(Date.UTC(year, 0, 1)),
      addDays(easter, 1),
      new Date(Date.UTC(year, 4, 1)),
      new Date(Date.UTC(year, 4, 8)),
      addDays(easter, 39),
      addDays(easter, 50),
      new Date(Date.UTC(year, 6, 14)),
      new Date(Date.UTC(year, 7, 15)),
      new Date(Date.UTC(year, 10, 1)),
      new Date(Date.UTC(year, 10, 11)),
      new Date(Date.UTC(year, 11, 25)),
    ];
    return new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  }

  /**
   * Ventilation fine des heures : normal / nuit (22h-6h) / dimanche / jour férié.
   * Un jour férié ou dimanche majore l'intégralité de la vacation (pas de cumul avec la nuit).
   */
  async payrollBreakdown(startDate?: string, endDate?: string) {
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

    const holidaysByYear = new Map<number, Set<string>>();
    const getHolidays = (year: number) => {
      if (!holidaysByYear.has(year)) {
        holidaysByYear.set(year, this.getFrenchPublicHolidays(year));
      }
      return holidaysByYear.get(year)!;
    };

    type Agg = {
      agentName: string;
      agentEmail: string;
      normalMinutes: number;
      nightMinutes: number;
      sundayMinutes: number;
      holidayMinutes: number;
    };
    const byAgent = new Map<string, Agg>();

    const nightOverlapMinutes = (checkIn: Date, checkOut: Date) => {
      let minutes = 0;
      const cursor = new Date(checkIn);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor.getTime() < checkOut.getTime()) {
        const nightStart = new Date(cursor.getTime() + 22 * 60 * 60 * 1000);
        const nightEnd = new Date(cursor.getTime() + 30 * 60 * 60 * 1000); // 06:00 le lendemain
        const overlapStart = Math.max(checkIn.getTime(), nightStart.getTime());
        const overlapEnd = Math.min(checkOut.getTime(), nightEnd.getTime());
        if (overlapEnd > overlapStart) {
          minutes += (overlapEnd - overlapStart) / 60000;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return minutes;
    };

    attendances.forEach((att) => {
      if (!att.checkInTime || !att.checkOutTime) return;
      const dateKey = att.date.toISOString().slice(0, 10);
      const year = att.date.getUTCFullYear();
      const totalMinutes = Math.max(0, (att.checkOutTime.getTime() - att.checkInTime.getTime()) / 60000);
      const key = att.userId;
      const existing = byAgent.get(key) ?? {
        agentName: `${att.user.firstName} ${att.user.lastName}`.trim(),
        agentEmail: att.user.email,
        normalMinutes: 0,
        nightMinutes: 0,
        sundayMinutes: 0,
        holidayMinutes: 0,
      };

      if (getHolidays(year).has(dateKey)) {
        existing.holidayMinutes += totalMinutes;
      } else if (att.date.getUTCDay() === 0) {
        existing.sundayMinutes += totalMinutes;
      } else {
        const night = Math.min(totalMinutes, nightOverlapMinutes(att.checkInTime, att.checkOutTime));
        existing.nightMinutes += night;
        existing.normalMinutes += totalMinutes - night;
      }
      byAgent.set(key, existing);
    });

    const toHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
    return Array.from(byAgent.values())
      .map((agg) => ({
        agentName: agg.agentName,
        agentEmail: agg.agentEmail,
        normalHours: toHours(agg.normalMinutes),
        nightHours: toHours(agg.nightMinutes),
        sundayHours: toHours(agg.sundayMinutes),
        holidayHours: toHours(agg.holidayMinutes),
      }))
      .sort((a, b) => a.agentName.localeCompare(b.agentName));
  }

  async pushPayrollToPayrollProvider(startDate?: string, endDate?: string) {
    const breakdown = await this.payrollBreakdown(startDate, endDate);
    await this.webhooksService.dispatch('payroll.export', {
      period: { startDate, endDate },
      rows: breakdown,
    });
    return { dispatched: true, agentCount: breakdown.length };
  }
}
