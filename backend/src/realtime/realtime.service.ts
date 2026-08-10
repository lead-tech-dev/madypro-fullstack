import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { WebhooksService } from '../webhooks/webhooks.service';

type Client = {
  id: string;
  res: Response;
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private clients = new Set<Client>();

  constructor(private readonly webhooksService: WebhooksService) {}

  addClient(res: Response, clientId: string) {
    const client: Client = { res, id: clientId };
    this.clients.add(client);
    res.on('close', () => {
      this.clients.delete(client);
    });
    this.logger.debug(`Client ${clientId} connected (total ${this.clients.size})`);
    res.write(`event: connected\ndata: "${clientId}"\n\n`);
  }

  broadcast(event: string, payload: any) {
    const data = JSON.stringify(payload ?? {});
    for (const client of this.clients) {
      client.res.write(`event: ${event}\ndata: ${data}\n\n`);
    }
    this.webhooksService.dispatch(event, payload).catch((error) => {
      this.logger.warn(`Échec dispatch webhooks pour ${event}: ${error.message}`);
    });
  }
}
