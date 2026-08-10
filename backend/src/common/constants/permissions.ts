export const PERMISSIONS = {
  SETTINGS_MANAGE: 'settings:manage',
  USERS_MANAGE: 'users:manage',
  REPORTS_EXPORT: 'reports:export',
  WEBHOOKS_MANAGE: 'webhooks:manage',
} as const;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
