export type IcsInterventionInput = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  label: string | null;
  status: string;
};

/** Construit un flux .ics à partir d'interventions d'un site. Réutilisé par le flux calendrier
 * public et par l'envoi du planning au client. */
export function buildIcs(siteName: string, interventions: IcsInterventionInput[]): string {
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
