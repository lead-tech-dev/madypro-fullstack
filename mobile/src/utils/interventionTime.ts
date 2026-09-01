import { Intervention } from '@/types/intervention';

export function getActualDate(intervention: Intervention) {
  if (intervention.actualStartAt) {
    return new Date(intervention.actualStartAt);
  }
  if (intervention.actualStartTime) {
    return buildDateTime(intervention.date, intervention.actualStartTime);
  }
  return null;
}

export function buildDateTime(date: string, time: string) {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}`);
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
