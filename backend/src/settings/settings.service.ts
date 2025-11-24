import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateAttendanceRulesDto } from './dto/update-attendance-rules.dto';
import { CreateAbsenceTypeDto } from './dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from './dto/update-absence-type.dto';
import { AuditService } from '../audit/audit.service';

export type AttendanceRules = {
  gpsDistanceMeters: number;
  toleranceMinutes: number;
  minimumDurationMinutes: number;
};

export type AbsenceTypeConfig = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type RolePermission = {
  role: string;
  description: string;
  permissions: string[];
};

@Injectable()
export class SettingsService {
  private attendanceRules: AttendanceRules = {
    gpsDistanceMeters: 100,
    toleranceMinutes: 10,
    minimumDurationMinutes: 15,
  };

  private absenceTypes: AbsenceTypeConfig[] = [
    { id: 'type-sick', code: 'SICK', name: 'Arrêt maladie', active: true },
    { id: 'type-paid', code: 'PAID_LEAVE', name: 'Congés payés', active: true },
    { id: 'type-unpaid', code: 'UNPAID', name: 'Sans solde', active: true },
    { id: 'type-other', code: 'OTHER', name: 'Autre', active: true },
  ];

  private roles: RolePermission[] = [
    {
      role: 'ADMIN',
      description: 'Accès complet back-office',
      permissions: ['Gestion utilisateurs', 'Paramètres globaux', 'Pointages & absences', 'Export paie/facturation'],
    },
    {
      role: 'SUPERVISOR',
      description: 'Pilotage des sites attribués',
      permissions: ['Suivi planning sites attribués', 'Validation pointages', 'Gestion des absences locales'],
    },
    {
      role: 'AGENT',
      description: 'Application mobile terrain',
      permissions: ['Pointage mobile', 'Consultation planning personnel'],
    },
  ];

  constructor(private readonly auditService: AuditService) {}

  getSettings() {
    return {
      attendanceRules: this.attendanceRules,
      absenceTypes: this.absenceTypes,
      roles: this.roles,
    };
  }

  updateAttendanceRules(dto: UpdateAttendanceRulesDto) {
    this.attendanceRules = { ...dto };
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'attendanceRules',
      details: JSON.stringify(dto),
    });
    return this.attendanceRules;
  }

  createAbsenceType(dto: CreateAbsenceTypeDto) {
    const code = dto.code.trim().toUpperCase();
    if (this.absenceTypes.some((type) => type.code === code)) {
      throw new BadRequestException('Ce code existe déjà');
    }
    const type: AbsenceTypeConfig = {
      id: `type-${Date.now()}`,
      code,
      name: dto.name.trim(),
      active: true,
    };
    this.absenceTypes.push(type);
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'absenceType',
      entityId: type.id,
      details: `Ajout ${code}`,
    });
    return type;
  }

  updateAbsenceType(code: string, dto: UpdateAbsenceTypeDto) {
    const type = this.absenceTypes.find((item) => item.code === code);
    if (!type) {
      throw new NotFoundException('Type introuvable');
    }
    if (dto.name !== undefined) type.name = dto.name;
    if (dto.active !== undefined) type.active = dto.active;
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'absenceType',
      entityId: type.id,
      details: `Mise à jour ${code}`,
    });
    return type;
  }
}
