import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UpdateAttendanceRulesDto } from './dto/update-attendance-rules.dto';
import { CreateAbsenceTypeDto } from './dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from './dto/update-absence-type.dto';
import { UpdateCompanyInfoDto } from './dto/update-company-info.dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';

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

export type CompanyInfo = {
  legalName: string;
  siret: string;
  vatNumber: string;
  address: string;
  iban: string;
  bic: string;
  phone: string;
  email: string;
  logoUrl: string;
};

const ATTENDANCE_RULES_KEY = 'attendanceRules';
const ABSENCE_TYPES_KEY = 'absenceTypes';
const COMPANY_INFO_KEY = 'companyInfo';

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  legalName: '',
  siret: '',
  vatNumber: '',
  address: '',
  iban: '',
  bic: '',
  phone: '',
  email: '',
  logoUrl: '',
};

const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  gpsDistanceMeters: 100,
  toleranceMinutes: 10,
  minimumDurationMinutes: 15,
};

const DEFAULT_ABSENCE_TYPES: AbsenceTypeConfig[] = [
  { id: 'type-sick', code: 'SICK', name: 'Arrêt maladie', active: true },
  { id: 'type-paid', code: 'PAID_LEAVE', name: 'Congés payés', active: true },
  { id: 'type-unpaid', code: 'UNPAID', name: 'Sans solde', active: true },
  { id: 'type-other', code: 'OTHER', name: 'Autre', active: true },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  private attendanceRules: AttendanceRules = DEFAULT_ATTENDANCE_RULES;
  private absenceTypes: AbsenceTypeConfig[] = DEFAULT_ABSENCE_TYPES;
  private companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO;

  private readonly roles: RolePermission[] = [
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

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const [rulesRow, typesRow, companyRow] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: ATTENDANCE_RULES_KEY } }),
      this.prisma.setting.findUnique({ where: { key: ABSENCE_TYPES_KEY } }),
      this.prisma.setting.findUnique({ where: { key: COMPANY_INFO_KEY } }),
    ]);
    if (rulesRow?.value) {
      this.attendanceRules = rulesRow.value as unknown as AttendanceRules;
    }
    if (typesRow?.value) {
      this.absenceTypes = typesRow.value as unknown as AbsenceTypeConfig[];
    }
    if (companyRow?.value) {
      this.companyInfo = { ...DEFAULT_COMPANY_INFO, ...(companyRow.value as unknown as CompanyInfo) };
    }
  }

  private async persistAttendanceRules() {
    await this.prisma.setting.upsert({
      where: { key: ATTENDANCE_RULES_KEY },
      update: { value: this.attendanceRules as any },
      create: { key: ATTENDANCE_RULES_KEY, value: this.attendanceRules as any },
    });
  }

  private async persistAbsenceTypes() {
    await this.prisma.setting.upsert({
      where: { key: ABSENCE_TYPES_KEY },
      update: { value: this.absenceTypes as any },
      create: { key: ABSENCE_TYPES_KEY, value: this.absenceTypes as any },
    });
  }

  private async persistCompanyInfo() {
    await this.prisma.setting.upsert({
      where: { key: COMPANY_INFO_KEY },
      update: { value: this.companyInfo as any },
      create: { key: COMPANY_INFO_KEY, value: this.companyInfo as any },
    });
  }

  getSettings() {
    return {
      attendanceRules: this.attendanceRules,
      absenceTypes: this.absenceTypes,
      roles: this.roles,
    };
  }

  async updateAttendanceRules(dto: UpdateAttendanceRulesDto) {
    this.attendanceRules = { ...dto };
    await this.persistAttendanceRules();
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'attendanceRules',
      details: JSON.stringify(dto),
    });
    return this.attendanceRules;
  }

  async createAbsenceType(dto: CreateAbsenceTypeDto) {
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
    await this.persistAbsenceTypes();
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'absenceType',
      entityId: type.id,
      details: `Ajout ${code}`,
    });
    return type;
  }

  async updateAbsenceType(code: string, dto: UpdateAbsenceTypeDto) {
    const type = this.absenceTypes.find((item) => item.code === code);
    if (!type) {
      throw new NotFoundException('Type introuvable');
    }
    if (dto.name !== undefined) type.name = dto.name;
    if (dto.active !== undefined) type.active = dto.active;
    await this.persistAbsenceTypes();
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'absenceType',
      entityId: type.id,
      details: `Mise à jour ${code}`,
    });
    return type;
  }

  getCompanyInfo() {
    return this.companyInfo;
  }

  async updateCompanyInfo(dto: UpdateCompanyInfoDto) {
    this.companyInfo = { ...this.companyInfo, ...dto };
    await this.persistCompanyInfo();
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'UPDATE_SETTINGS',
      entityType: 'companyInfo',
      details: JSON.stringify(dto),
    });
    return this.companyInfo;
  }
}
