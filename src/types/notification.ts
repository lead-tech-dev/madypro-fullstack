export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  receivedAt: string;
  read: boolean;
  audience?: string;
  targetName?: string;
  data?: Record<string, unknown>;
};
