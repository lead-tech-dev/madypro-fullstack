import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

type Client = {
  id: string;
  res: Response;
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private clients = new Set<Client>();

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
  }
}
