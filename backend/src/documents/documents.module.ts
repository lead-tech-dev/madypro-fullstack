import { Module } from '@nestjs/common';
import { DocumentNumberingService } from './document-numbering.service';
import { DocumentPdfService } from './document-pdf.service';

@Module({
  providers: [DocumentNumberingService, DocumentPdfService],
  exports: [DocumentNumberingService, DocumentPdfService],
})
export class DocumentsModule {}
