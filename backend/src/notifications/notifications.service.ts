import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { NotificationEntity, NotificationAudience } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class NotificationsService {
  private notifications: NotificationEntity[] = [];
  private expoTokens = new Map<string, Set<string>>();
  private deviceTokens = new Map<string, Set<string>>(); // FCM/APNs
  private readonly logger = new Logger(NotificationsService.name);

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

  registerToken(userId: string | undefined, expoToken?: string, deviceToken?: string) {
    if (!userId) {
      throw new BadRequestException('Utilisateur requis');
    }
    const expo = this.expoTokens.get(userId) ?? new Set<string>();
    const native = this.deviceTokens.get(userId) ?? new Set<string>();
    if (expoToken) expo.add(expoToken);
    if (deviceToken) native.add(deviceToken);
    if (!expoToken && !deviceToken) {
      throw new BadRequestException('Aucun token fourni');
    }
    this.expoTokens.set(userId, expo);
    this.deviceTokens.set(userId, native);
    this.logger.log(
      `[Push] Tokens enregistrés pour ${userId}: expo=${expoToken ? 'oui' : 'non'}, fcm=${deviceToken ? 'oui' : 'non'}`,
    );
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
    const expoTokens = targetUserIds.flatMap((userId) => Array.from(this.expoTokens.get(userId) ?? []));
    const nativeTokens = targetUserIds.flatMap((userId) => Array.from(this.deviceTokens.get(userId) ?? []));
    this.logger.log(
      `[Push] Dispatch notification ${notification.id} -> expo=${expoTokens.length} fcm=${nativeTokens.length}`,
    );
    this.dispatchExpo(notification, expoTokens);
    this.dispatchFcm(notification, nativeTokens);
  }

  private resolveTargets(notification: NotificationEntity): string[] {
    if (notification.audience === 'ALL_AGENTS' || notification.audience === 'SITE_AGENTS') {
      return Array.from(new Set([...this.expoTokens.keys(), ...this.deviceTokens.keys()]));
    }
    if (notification.audience === 'AGENT' && notification.targetId) {
      return [notification.targetId];
    }
    return [];
  }

  private dispatchExpo(notification: NotificationEntity, tokens: string[]) {
    if (!tokens.length) return;
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

  private dispatchFcm(notification: NotificationEntity, tokens: string[]) {
    if (!tokens.length) return;
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('FCM v1 non configuré (FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY manquant)');
      return;
    }
    this.getFcmAccessToken(clientEmail, privateKey)
      .then(async (accessToken) => {
        const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
        for (const token of tokens) {
          const payload = {
            message: {
              token,
              notification: {
                title: notification.title,
                body: notification.message,
              },
              data: { notificationId: notification.id },
            },
          };
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const txt = await res.text();
              this.logger.warn(`[Push] FCM v1 response ${res.status}: ${txt}`);
            }
          } catch (err) {
            console.warn('FCM v1 push error', err?.message || err);
          }
        }
      })
      .catch((err) => console.warn('FCM token error', err?.message || err));
  }

  private async getFcmAccessToken(clientEmail: string, privateKey: string) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const scope = 'https://www.googleapis.com/auth/firebase.messaging';
    const payload = {
      iss: clientEmail,
      sub: clientEmail,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };
    const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const toSign = `${encode(header)}.${encode(payload)}`;
    const key = privateKey.replace(/\\n/g, '\n');
    const signature = crypto.createSign('RSA-SHA256').update(toSign).sign(key, 'base64url');
    const jwt = `${toSign}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OAuth token error: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { access_token: string };
    return json.access_token;
  }
}
