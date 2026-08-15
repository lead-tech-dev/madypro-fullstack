const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Lundi de la semaine UTC contenant `date`, à minuit UTC. */
function startOfWeekUTC(date: Date): Date {
  const day = date.getUTCDay(); // 0 = dimanche
  const mondayOffset = (day + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  return start;
}

export type TemplateLike = {
  siteId: string;
  startDate: Date;
  endDate?: Date | null;
};

export type TemplateStopLike = {
  id: string;
  daysOfWeek: number[];
  intervalWeeks: number;
  categoryId?: string | null;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

export type TemplateOccurrence = {
  date: string;
  stopId: string;
  siteId: string;
  categoryId?: string | null;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

/**
 * Calcule les occurrences d'un gabarit d'intervention (un seul site, un ou plusieurs arrêts,
 * chacun avec ses propres jours de la semaine, horaire, fréquence, agents) à l'intérieur d'une
 * fenêtre [horizonStart, horizonEnd] (bornes incluses, UTC, minuit). Un arrêt peut couvrir
 * plusieurs jours de la semaine (ex. "Lun/Mer/Ven") avec sa propre cadence (ex. chaque semaine
 * pour un arrêt, une semaine sur deux pour un autre du même gabarit).
 */
export function computeTemplateOccurrences(
  template: TemplateLike,
  stops: TemplateStopLike[],
  horizonStart: Date,
  horizonEnd: Date,
): TemplateOccurrence[] {
  const effectiveStart = template.startDate > horizonStart ? template.startDate : horizonStart;
  const effectiveEnd = template.endDate && template.endDate < horizonEnd ? template.endDate : horizonEnd;
  if (effectiveStart > effectiveEnd || !stops.length) {
    return [];
  }

  const templateWeekStart = startOfWeekUTC(template.startDate);
  const occurrences: TemplateOccurrence[] = [];

  let cursor = new Date(Date.UTC(effectiveStart.getUTCFullYear(), effectiveStart.getUTCMonth(), effectiveStart.getUTCDate()));
  const end = new Date(Date.UTC(effectiveEnd.getUTCFullYear(), effectiveEnd.getUTCMonth(), effectiveEnd.getUTCDate()));

  while (cursor <= end) {
    const cursorWeekStart = startOfWeekUTC(cursor);
    const weeksDiff = Math.round((cursorWeekStart.getTime() - templateWeekStart.getTime()) / MS_PER_WEEK);
    const date = cursor.toISOString().slice(0, 10);
    for (const stop of stops) {
      const intervalWeeks = Math.max(1, stop.intervalWeeks || 1);
      if (weeksDiff >= 0 && weeksDiff % intervalWeeks === 0 && stop.daysOfWeek.includes(cursor.getUTCDay())) {
        occurrences.push({
          date,
          stopId: stop.id,
          siteId: template.siteId,
          categoryId: stop.categoryId,
          startTime: stop.startTime,
          endTime: stop.endTime,
          agentIds: stop.agentIds,
        });
      }
    }
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return occurrences;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}

function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function daysOverlap(a: number[], b: number[]): boolean {
  return a.some((day) => b.includes(day));
}

/**
 * Détecte, au sein d'un même gabarit, les paires d'arrêts dont les jours se recoupent et qui
 * partagent au moins un agent avec des horaires qui se chevauchent (un agent ne peut pas être à
 * deux endroits en même temps).
 */
export function findTemplateStopConflicts(
  stops: TemplateStopLike[],
): Array<{ a: TemplateStopLike; b: TemplateStopLike; agentId: string }> {
  const conflicts: Array<{ a: TemplateStopLike; b: TemplateStopLike; agentId: string }> = [];
  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      const a = stops[i];
      const b = stops[j];
      if (!daysOverlap(a.daysOfWeek, b.daysOfWeek)) continue;
      if (!timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      const sharedAgent = a.agentIds.find((id) => b.agentIds.includes(id));
      if (sharedAgent) {
        conflicts.push({ a, b, agentId: sharedAgent });
      }
    }
  }
  return conflicts;
}
