import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(to: string, subject: string, html: string) {
    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;
    const from = process.env.MAILGUN_FROM || 'Madypro Clean <no-reply@madyproclean.com>';

    if (!domain || !apiKey) {
      this.logger.warn('MAILGUN_DOMAIN ou MAILGUN_API_KEY manquant, email non envoyé');
      return { skipped: true };
    }

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');
    const body = new URLSearchParams();
    body.append('from', from);
    body.append('to', to);
    body.append('subject', subject);
    body.append('html', html);

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      const message = `Mailgun error: ${res.status} ${text}`;
      this.logger.error(message);
      throw new Error(message);
    }
    return { sent: true };
  }
}
