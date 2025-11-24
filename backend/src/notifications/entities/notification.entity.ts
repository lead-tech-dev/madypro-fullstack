export type NotificationAudience = 'ALL_AGENTS' | 'SITE_AGENTS' | 'AGENT';

export class NotificationEntity {
  id!: string;
  title!: string;
  message!: string;
  audience!: NotificationAudience;
  targetId?: string;
  targetName?: string;
  createdAt!: Date;
}
