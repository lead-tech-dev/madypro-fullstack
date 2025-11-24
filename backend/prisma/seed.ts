import { PrismaClient, Role, InterventionType, InterventionStatus, AbsenceType, AbsenceStatus, NotificationAudience, AttendanceStatus, AuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.interventionAssignment.deleteMany();
  await prisma.interventionTruck.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.siteSupervisor.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.site.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'Madypro',
      email: 'admin@madyproclean.com',
      phone: '+33 6 00 00 00 01',
      role: Role.ADMIN,
      password: await bcrypt.hash('admin123', 10),
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      firstName: 'Superviseur',
      lastName: 'MJ',
      email: 'supervisor@madyproclean.com',
      phone: '+33 6 00 00 00 02',
      role: Role.SUPERVISOR,
      password: await bcrypt.hash('supervisor123', 10),
    },
  });

  const agentLucas = await prisma.user.create({
    data: {
      firstName: 'Lucas',
      lastName: 'Pereira',
      email: 'lucas.pereira@madyproclean.com',
      phone: '+33 6 00 00 00 10',
      role: Role.AGENT,
      password: await bcrypt.hash('agent123', 10),
    },
  });

  const agentImen = await prisma.user.create({
    data: {
      firstName: 'Imen',
      lastName: 'Rami',
      email: 'imen.rami@madyproclean.com',
      phone: '+33 6 00 00 00 12',
      role: Role.AGENT,
      password: await bcrypt.hash('agent123', 10),
    },
  });

  const clientArches = await prisma.client.create({
    data: {
      name: 'Maison Arches',
      contactName: 'Claire Lenoir',
      contactEmail: 'claire@arches.com',
    },
  });

  const clientViva = await prisma.client.create({
    data: {
      name: 'Viva Retail',
      contactName: 'Julien Vasseur',
      contactEmail: 'julien@vivaretail.com',
    },
  });

  const siteAtelier = await prisma.site.create({
    data: {
      name: 'Atelier Genève',
      address: 'Rue du Rhône 12, Genève',
      latitude: 46.2044,
      longitude: 6.1432,
      timeWindow: '06:00-14:00',
      clientId: clientArches.id,
      supervisors: {
        create: [{ userId: supervisor.id }],
      },
    },
  });

  const siteViva = await prisma.site.create({
    data: {
      name: 'Siège Viva Retail',
      address: '25 Rue du Général Foy, Paris',
      latitude: 48.875,
      longitude: 2.319,
      timeWindow: '08:00-18:00',
      clientId: clientViva.id,
      supervisors: {
        create: [{ userId: supervisor.id }],
      },
    },
  });

  const atelierRule = await prisma.interventionRule.create({
    data: {
      siteId: siteAtelier.id,
      label: 'Nettoyage atelier – matin',
      startTime: '06:00',
      endTime: '09:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      agentIds: [agentLucas.id],
    },
  });

  const today = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.intervention.create({
    data: {
      siteId: siteAtelier.id,
      date: today,
      startTime: '06:00',
      endTime: '09:00',
      type: InterventionType.REGULAR,
      label: 'Nettoyage du site – matin',
      status: InterventionStatus.PLANNED,
      observation: 'Prévoir contrôle qualité',
      generatedFromRuleId: atelierRule.id,
      assignments: {
        create: [{ userId: agentLucas.id }],
      },
    },
  });

  await prisma.intervention.create({
    data: {
      siteId: siteViva.id,
      date: tomorrow,
      startTime: '09:00',
      endTime: '13:00',
      type: InterventionType.PUNCTUAL,
      subType: 'Nettoyage de fin de chantier',
      label: 'Ponctuel Viva',
      status: InterventionStatus.PLANNED,
      observation: 'Client VIP',
      assignments: {
        create: [{ userId: agentImen.id }],
      },
      trucks: {
        create: [{ label: 'Camion 01' }],
      },
    },
  });

  await prisma.attendance.create({
    data: {
      userId: agentLucas.id,
      siteId: siteAtelier.id,
      clientId: clientArches.id,
      date: today,
      checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 5, 58),
      checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 5),
      plannedStart: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0),
      plannedEnd: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      checkInLatitude: 46.205,
      checkInLongitude: 6.142,
      checkOutLatitude: 46.2053,
      checkOutLongitude: 6.1421,
      status: AttendanceStatus.COMPLETED,
      manual: false,
      createdBy: 'AGENT',
      note: 'RAS',
    },
  });

  await prisma.absence.create({
    data: {
      userId: agentImen.id,
      type: AbsenceType.SICK,
      status: AbsenceStatus.PENDING,
      from: new Date(),
      to: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Fièvre',
      note: 'Repos conseillé',
      manual: false,
      createdBy: 'USER',
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Brief Matinal',
      message: 'Point sécurité + rotation pour Viva Retail 8h00',
      audience: NotificationAudience.SITE_AGENTS,
      targetId: siteViva.id,
      targetName: siteViva.name,
    },
  });

  await prisma.setting.create({
    data: {
      key: 'attendanceRules',
      value: {
        gpsDistanceMeters: 100,
        toleranceMinutes: 10,
        minimumDurationMinutes: 15,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.email,
      action: AuditAction.UPDATE_SETTINGS,
      entityType: 'setting',
      entityId: 'attendanceRules',
      details: 'Initial seed',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
