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

export type SettingsSummary = {
  attendanceRules: AttendanceRules;
  absenceTypes: AbsenceTypeConfig[];
  roles: RolePermission[];
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
