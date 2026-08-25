import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function combine(dateStr: string, time: string) {
  return new Date(`${dateStr}T${time}:00`);
}

/**
 * Vérifie qu'aucun des agents n'est déjà planifié sur une intervention qui
 * chevauche ce créneau, ni en absence validée à cette date.
 * Partagé entre InterventionsService (affectation) et ShiftSwapsService (acceptation d'échange)
 * pour éviter que les deux contrôles divergent silencieusement.
 */
export async function checkAssignmentConflicts(
  prisma: Pick<PrismaClient, 'intervention' | 'user' | 'absence'>,
  agentIds: string[],
  dateStr: string,
  startTime: string,
  endTime: string,
  excludeInterventionId?: string,
) {
  if (!agentIds.length) return;

  const dayStart = toDateOnly(dateStr);
  const dayEnd = endOfDay(dateStr);
  const newStart = combine(dateStr, startTime);
  const newEnd = combine(dateStr, endTime);

  const sameDayInterventions = await prisma.intervention.findMany({
    where: {
      date: dayStart,
      ...(excludeInterventionId ? { id: { not: excludeInterventionId } } : {}),
      status: { notIn: ['CANCELLED'] },
      assignments: { some: { userId: { in: agentIds } } },
    },
    include: { assignments: true, site: true },
  });

  for (const other of sameDayInterventions) {
    const otherStart = combine(dateStr, other.startTime);
    const otherEnd = combine(dateStr, other.endTime);
    const overlaps = newStart < otherEnd && otherStart < newEnd;
    if (!overlaps) continue;
    const conflictingIds = new Set(other.assignments.map((a) => a.userId));
    const conflictingAgentIds = agentIds.filter((id) => conflictingIds.has(id));
    if (!conflictingAgentIds.length) continue;
    const agents = await prisma.user.findMany({ where: { id: { in: conflictingAgentIds } } });
    const names = agents.map((a) => `${a.firstName} ${a.lastName}`.trim()).join(', ');
    throw new BadRequestException(
      `Conflit d'affectation : ${names || 'un agent'} déjà planifié sur "${other.site?.name ?? other.siteId}" de ${other.startTime} à ${other.endTime} le ${dateStr}.`,
    );
  }

  const absences = await prisma.absence.findMany({
    where: {
      userId: { in: agentIds },
      status: 'APPROVED',
      from: { lte: dayEnd },
      to: { gte: dayStart },
    },
    include: { user: true },
  });
  if (absences.length) {
    const names = Array.from(new Set(absences.map((a) => `${a.user.firstName} ${a.user.lastName}`.trim()))).join(
      ', ',
    );
    throw new BadRequestException(`Conflit d'affectation : ${names} en absence validée le ${dateStr}.`);
  }
}
