import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { DocumentsModule } from '../documents/documents.module';
import { SettingsModule } from '../settings/settings.module';
import { MailerModule } from '../notifications/mailer.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DocumentsModule, SettingsModule, MailerModule, InvoicesModule, AuditModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
