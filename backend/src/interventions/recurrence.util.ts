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
