import { Injectable, BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';
import { NotificationEntity, NotificationAudience } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NotificationsService {
  private notifications: NotificationEntity[] = [];
  private deviceTokens = new Map<string, Set<string>>();

  constructor(
    private readonly usersService: UsersService,
    private readonly sitesService: SitesService,
    private readonly auditService: AuditService,
  ) {
    this.seed();
  }

  private seed() {
    this.notifications = [
      {
        id: 'notif-1',
        title: 'Brief Matinal',
        message: 'Point sécurité + rotation pour Viva Retail 8h00',
        audience: 'SITE_AGENTS',
        targetId: 'site-viva',
        targetName: 'Siège Viva Retail',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        id: 'notif-2',
        title: 'Rappel badge',
        message: 'Merci de badger à l’arrivée sur Atelier Genève',
        audience: 'ALL_AGENTS',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ];
  }

  list(page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const items = this.notifications.slice(start, start + pageSize);
    return {
      items,
      total: this.notifications.length,
      page,
      pageSize,
    };
  }

  registerToken(userId: string | undefined, token: string) {
    if (!userId) {
      throw new BadRequestException('Utilisateur requis');
    }
    const tokens = this.deviceTokens.get(userId) ?? new Set<string>();
    tokens.add(token);
    this.deviceTokens.set(userId, tokens);
    return { success: true };
  }

  feed(user: { sub: string; role: string }) {
    if (!user) {
      return [];
    }
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      return this.notifications;
    }
    return this.notifications.filter((notification) => {
      if (notification.audience === 'ALL_AGENTS') {
        return true;
      }
      if (notification.audience === 'AGENT') {
        return notification.targetId === user.sub;
      }
      if (notification.audience === 'SITE_AGENTS') {
        // TODO: filter by real site assignments
        return true;
      }
      return false;
    });
  }

  send(dto: SendNotificationDto) {
    let targetName: string | undefined;
    if (dto.audience === 'SITE_AGENTS') {
      if (!dto.targetId) {
        throw new BadRequestException('siteId requis');
      }
      const site = this.sitesService.findOne(dto.targetId);
      targetName = site.name;
    }
    if (dto.audience === 'AGENT') {
      if (!dto.targetId) {
        throw new BadRequestException('userId requis');
      }
      const user = this.usersService.findOne(dto.targetId);
      targetName = user?.name ?? 'Agent';
    }

    const notification: NotificationEntity = {
      id: `notif-${Date.now()}`,
      title: dto.title,
      message: dto.message,
      audience: dto.audience,
      targetId: dto.targetId,
      targetName,
      createdAt: new Date(),
    };
    this.notifications.unshift(notification);
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'CREATE_NOTIFICATION',
      entityType: 'notification',
      entityId: notification.id,
      details: dto.title,
    });
    this.dispatch(notification);
    return notification;
  }

  private dispatch(notification: NotificationEntity) {
    const targetUserIds = this.resolveTargets(notification);
    if (!targetUserIds.length) {
      return;
    }
    const tokens = targetUserIds.flatMap((userId) => Array.from(this.deviceTokens.get(userId) ?? []));
    if (!tokens.length) {
      return;
    }
    const payloads = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
      },
    }));
    const chunks: typeof payloads[] = [];
    const size = 90;
    for (let i = 0; i < payloads.length; i += size) {
      chunks.push(payloads.slice(i, i + size));
    }
    chunks.forEach(async (chunk) => {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
      } catch (error) {
        console.warn('Expo push error', error);
      }
    });
  }

  private resolveTargets(notification: NotificationEntity): string[] {
    if (notification.audience === 'ALL_AGENTS' || notification.audience === 'SITE_AGENTS') {
      return Array.from(this.deviceTokens.keys());
    }
    if (notification.audience === 'AGENT' && notification.targetId) {
      return [notification.targetId];
    }
    return [];
  }
}
