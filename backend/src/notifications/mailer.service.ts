import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  private buildTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure =
      (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;

    if (!host) {
      this.logger.warn('SMTP_HOST non configuré, email non envoyé');
      return null;
    }
    if (!user || !pass) {
      this.logger.warn('SMTP_USER ou SMTP_PASS manquant, email non envoyé');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async send(to: string, subject: string, html: string) {
    const transporter = this.buildTransporter();
    if (!transporter) {
      return { skipped: true };
    }
    const from = process.env.SMTP_FROM || 'no-reply@madyproclean.com';
    await transporter.sendMail({ from, to, subject, html });
    return { sent: true };
  }
}
