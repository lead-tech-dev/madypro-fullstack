import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(to: string, subject: string, html: string) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM || 'Madypro Clean <no-reply@madyproclean.com>';

    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY manquant, email non envoyé');
      return { skipped: true };
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const message = `SendGrid error: ${res.status} ${text}`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.log(`Mail envoyé via SendGrid à ${to}`);
    return { sent: true, provider: 'sendgrid' };
  }
}
