export type RecurrenceRuleLike = {
  daysOfWeek: number[];
  intervalWeeks: number;
  startDate: Date;
  endDate?: Date | null;
};

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

/**
 * Calcule les dates d'occurrence d'une règle de récurrence (jours de la semaine +
 * intervalle en semaines, ex. 2 = "toutes les deux semaines") à l'intérieur d'une
 * fenêtre [horizonStart, horizonEnd] (bornes incluses, UTC, minuit).
 */
export function computeRuleOccurrences(rule: RecurrenceRuleLike, horizonStart: Date, horizonEnd: Date): string[] {
  const intervalWeeks = Math.max(1, rule.intervalWeeks || 1);
  const effectiveStart = rule.startDate > horizonStart ? rule.startDate : horizonStart;
  const effectiveEnd = rule.endDate && rule.endDate < horizonEnd ? rule.endDate : horizonEnd;
  if (effectiveStart > effectiveEnd || !rule.daysOfWeek.length) {
    return [];
  }

  const ruleWeekStart = startOfWeekUTC(rule.startDate);
  const dates: string[] = [];

  let cursor = new Date(Date.UTC(effectiveStart.getUTCFullYear(), effectiveStart.getUTCMonth(), effectiveStart.getUTCDate()));
  const end = new Date(Date.UTC(effectiveEnd.getUTCFullYear(), effectiveEnd.getUTCMonth(), effectiveEnd.getUTCDate()));

  while (cursor <= end) {
    if (rule.daysOfWeek.includes(cursor.getUTCDay())) {
      const cursorWeekStart = startOfWeekUTC(cursor);
      const weeksDiff = Math.round((cursorWeekStart.getTime() - ruleWeekStart.getTime()) / MS_PER_WEEK);
      if (weeksDiff >= 0 && weeksDiff % intervalWeeks === 0) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
    }
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return dates;
}

export type TourRuleLike = {
  intervalWeeks: number;
  startDate: Date;
  endDate?: Date | null;
};

export type TourStopLike = {
  id: string;
  dayOfWeek: number;
  siteId: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

export type TourOccurrence = {
  date: string;
  stopId: string;
  siteId: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

/**
 * Comme `computeRuleOccurrences`, mais pour une tournée : plusieurs arrêts (site/horaire/agents
 * différents) peuvent tomber sur des jours de la semaine différents, voire le même jour.
 */
export function computeTourOccurrences(
  rule: TourRuleLike,
  stops: TourStopLike[],
  horizonStart: Date,
  horizonEnd: Date,
): TourOccurrence[] {
  const intervalWeeks = Math.max(1, rule.intervalWeeks || 1);
  const effectiveStart = rule.startDate > horizonStart ? rule.startDate : horizonStart;
  const effectiveEnd = rule.endDate && rule.endDate < horizonEnd ? rule.endDate : horizonEnd;
  if (effectiveStart > effectiveEnd || !stops.length) {
    return [];
  }

  const ruleWeekStart = startOfWeekUTC(rule.startDate);
  const occurrences: TourOccurrence[] = [];

  let cursor = new Date(Date.UTC(effectiveStart.getUTCFullYear(), effectiveStart.getUTCMonth(), effectiveStart.getUTCDate()));
  const end = new Date(Date.UTC(effectiveEnd.getUTCFullYear(), effectiveEnd.getUTCMonth(), effectiveEnd.getUTCDate()));

  while (cursor <= end) {
    const cursorWeekStart = startOfWeekUTC(cursor);
    const weeksDiff = Math.round((cursorWeekStart.getTime() - ruleWeekStart.getTime()) / MS_PER_WEEK);
    if (weeksDiff >= 0 && weeksDiff % intervalWeeks === 0) {
      const date = cursor.toISOString().slice(0, 10);
      for (const stop of stops) {
        if (stop.dayOfWeek === cursor.getUTCDay()) {
          occurrences.push({
            date,
            stopId: stop.id,
            siteId: stop.siteId,
            startTime: stop.startTime,
            endTime: stop.endTime,
            agentIds: stop.agentIds,
          });
        }
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

/**
 * Détecte, au sein d'un même gabarit de tournée, les paires d'arrêts du même jour qui
 * partagent au moins un agent avec des horaires qui se chevauchent (un agent ne peut pas
 * être à deux endroits en même temps).
 */
export function findTourStopConflicts(stops: TourStopLike[]): Array<{ a: TourStopLike; b: TourStopLike; agentId: string }> {
  const conflicts: Array<{ a: TourStopLike; b: TourStopLike; agentId: string }> = [];
  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      const a = stops[i];
      const b = stops[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (!timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      const sharedAgent = a.agentIds.find((id) => b.agentIds.includes(id));
      if (sharedAgent) {
        conflicts.push({ a, b, agentId: sharedAgent });
      }
    }
  }
  return conflicts;
}
