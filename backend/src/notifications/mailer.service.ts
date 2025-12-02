import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  async send(to: string, subject: string, html: string) {
    if (!process.env.SMTP_HOST) {
      this.logger.warn('SMTP_HOST non configuré, email non envoyé');
      return { skipped: true };
    }
    const from = process.env.SMTP_FROM || 'no-reply@madyproclean.com';
    await this.transporter.sendMail({ from, to, subject, html });
    return { sent: true };
  }
}
