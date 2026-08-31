import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(
    to: string,
    subject: string,
    html: string,
    attachment?: { filename: string; content: string; type?: string; encoding?: 'utf8' | 'base64' },
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'Madypro Clean <no-reply@madyproclean.com>';

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY manquant, email non envoyé');
      return { skipped: true };
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        attachments: attachment
          ? [
              {
                filename: attachment.filename,
                content:
                  attachment.encoding === 'base64'
                    ? attachment.content
                    : Buffer.from(attachment.content, 'utf-8').toString('base64'),
              },
            ]
          : undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const message = `Resend error: ${res.status} ${text}`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.log(`Mail envoyé via Resend à ${to}`);
    return { sent: true, provider: 'resend' };
  }
}
