import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: { url: dto.url, events: dto.events, secret: randomBytes(24).toString('hex') },
    });
  }

  private async ensureExists(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException('Webhook introuvable');
    }
    return webhook;
  }

  async update(id: string, dto: UpdateWebhookDto) {
    await this.ensureExists(id);
    return this.prisma.webhook.update({
      where: { id },
      data: { url: dto.url, events: dto.events },
    });
  }

  async setStatus(id: string, active: boolean) {
    await this.ensureExists(id);
    return this.prisma.webhook.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.webhook.delete({ where: { id } });
    return { deleted: true };
  }

  async rotateSecret(id: string) {
    await this.ensureExists(id);
    const secret = randomBytes(24).toString('hex');
    await this.prisma.webhook.update({ where: { id }, data: { secret } });
    return { secret };
  }

  async dispatch(event: string, payload: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { active: true, events: { has: event } },
    });
    if (webhooks.length === 0) {
      return;
    }
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    for (const webhook of webhooks) {
      const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');
      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Madypro-Signature': signature },
        body,
      }).catch((error) => {
        this.logger.warn(`Échec dispatch webhook ${webhook.id} (${webhook.url}): ${error.message}`);
      });
    }
  }
}
