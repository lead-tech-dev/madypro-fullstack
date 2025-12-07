import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(to: string, subject: string, html: string) {
    // SMTP uniquement (ex: Gmail)
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
    const from = process.env.SMTP_FROM || 'Madypro Clean <no-reply@madyproclean.com>';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP non configuré (SMTP_HOST/USER/PASS manquants)');
      return { skipped: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    this.logger.log(`Mail envoyé via SMTP (Gmail) à ${to}`);
    return { sent: true, provider: 'smtp' };
  }
}
