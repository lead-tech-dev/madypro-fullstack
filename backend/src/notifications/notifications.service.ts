import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { NotificationEntity, NotificationAudience } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly sitesService: SitesService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async list(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count(),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async registerToken(userId: string | undefined, expoToken?: string, deviceToken?: string) {
    if (!userId) {
      throw new BadRequestException('Utilisateur requis');
    }
    if (!expoToken && !deviceToken) {
      throw new BadRequestException('Aucun token fourni');
    }
    // on upsert sur expoToken/fcmToken pour garantir l'unicité
    const existing = await this.prisma.pushToken.findFirst({
      where: {
        OR: [
          expoToken ? { expoToken } : undefined,
          deviceToken ? { fcmToken: deviceToken } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (existing) {
      await this.prisma.pushToken.update({
        where: { id: existing.id },
        data: {
          userId,
          expoToken: expoToken ?? existing.expoToken,
          fcmToken: deviceToken ?? existing.fcmToken,
        },
      });
    } else {
      await this.prisma.pushToken.create({
        data: {
          userId,
          expoToken: expoToken ?? null,
          fcmToken: deviceToken ?? null,
        },
      });
    }
    this.logger.log(`[Push] Tokens enregistrés pour ${userId}: expo=${expoToken ? 'oui' : 'non'}, fcm=${deviceToken ? 'oui' : 'non'}`);
    return { success: true };
  }

  async feed(user: { sub: string; role: string }) {
    if (!user) {
      return [];
    }
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      return this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    }
    return this.prisma.notification.findMany({
      where: {
        OR: [
          { audience: 'ALL_AGENTS' },
          { audience: 'AGENT', targetId: user.sub },
          // SITE_AGENTS: sans mapping site/agent, on envoie tout
          { audience: 'SITE_AGENTS' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async send(dto: SendNotificationDto) {
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

    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        audience: dto.audience,
        targetId: dto.targetId ?? null,
      },
    });
    this.auditService.record({
      actorId: 'admin@madyproclean.com',
      action: 'CREATE_NOTIFICATION',
      entityType: 'notification',
      entityId: notification.id,
      details: dto.title,
    });
    this.dispatch({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      audience: notification.audience as NotificationAudience,
      targetId: notification.targetId ?? undefined,
      targetName,
      createdAt: notification.createdAt,
    });
    return notification;
  }

  private async dispatch(notification: NotificationEntity) {
    // Récupère les tokens en fonction de l'audience
    let tokens;
    if (notification.audience === 'AGENT' && notification.targetId) {
      tokens = await this.prisma.pushToken.findMany({ where: { userId: notification.targetId } });
    } else {
      // ALL_AGENTS et SITE_AGENTS : faute de mapping agent/site fiable ici,
      // on envoie à tous les tokens enregistrés
      tokens = await this.prisma.pushToken.findMany();
    }
    if (!tokens.length) return;
    const expoTokens = tokens.map((t) => t.expoToken).filter(Boolean) as string[];
    const nativeTokens = tokens.map((t) => t.fcmToken).filter(Boolean) as string[];
    this.logger.log(
      `[Push] Dispatch notification ${notification.id} -> expo=${expoTokens.length} fcm=${nativeTokens.length}`,
    );
    this.dispatchExpo(notification, expoTokens);
    this.dispatchFcm(notification, nativeTokens);
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
