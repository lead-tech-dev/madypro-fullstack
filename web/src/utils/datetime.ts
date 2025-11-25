const defaultFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

export function formatDateTime(value: string | number | Date, formatter: Intl.DateTimeFormat = defaultFormatter) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return formatter.format(date);
}
