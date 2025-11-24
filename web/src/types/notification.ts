export type NotificationAudience = 'ALL_AGENTS' | 'SITE_AGENTS' | 'AGENT';

export type Notification = {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  targetId?: string;
  targetName?: string;
  createdAt: string;
};
