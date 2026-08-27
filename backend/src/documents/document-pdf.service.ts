import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { CompanyInfo } from '../settings/settings.service';
import { computeTotals, LineItemLike } from './line-items.util';

export type PdfLineItem = LineItemLike & { description: string };

export type PdfDocumentData = {
  kind: 'DEVIS' | 'FACTURE';
  number: string;
  label: string;
  clientName: string;
  clientAddress?: string | null;
  clientEmail?: string | null;
  issuedAt: Date;
  dueAt?: Date | null;
  notes?: string | null;
  lineItems: PdfLineItem[];
  paymentInfo?: { paidAt?: Date | null; paymentMethod?: string | null } | null;
};

const COL_X = { desc: 50, qty: 300, price: 355, vat: 425, total: 475 };
const PAGE_BOTTOM = 700;

@Injectable()
export class DocumentPdfService {
  generate(data: PdfDocumentData, company: CompanyInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const totals = computeTotals(data.lineItems);
      const title = data.kind === 'DEVIS' ? 'DEVIS' : 'FACTURE';

      doc.fontSize(20).text(company.legalName || 'Madypro Clean');
      doc.fontSize(9).fillColor('#555');
      if (company.address) doc.text(company.address);
      const legalLine = [company.siret ? `SIRET ${company.siret}` : null, company.vatNumber ? `TVA ${company.vatNumber}` : null]
        .filter(Boolean)
        .join(' — ');
      if (legalLine) doc.text(legalLine);
      const contactLine = [company.phone, company.email].filter(Boolean).join(' — ');
      if (contactLine) doc.text(contactLine);
      doc.fillColor('#000');

      doc.moveDown(1.5);
      doc.fontSize(16).text(`${title} ${data.number}`, { align: 'right' });
      doc.fontSize(10).fillColor('#555').text(`Émis le ${data.issuedAt.toLocaleDateString('fr-FR')}`, { align: 'right' });
      if (data.dueAt) doc.text(`Échéance : ${data.dueAt.toLocaleDateString('fr-FR')}`, { align: 'right' });
      doc.fillColor('#000');

      doc.moveDown(1);
      doc.fontSize(11).text('Client', { underline: true });
      doc.fontSize(10).text(data.clientName);
      if (data.clientAddress) doc.text(data.clientAddress);
      if (data.clientEmail) doc.text(data.clientEmail);

      doc.moveDown(1);
      doc.fontSize(11).text(data.label, { underline: true });

      doc.moveDown(0.5);
      let y = this.drawTableHeader(doc);

      doc.fontSize(9.5);
      for (const item of data.lineItems) {
        if (y > PAGE_BOTTOM) {
          doc.addPage();
          y = this.drawTableHeader(doc);
          doc.fontSize(9.5);
        }
        const lineTotal = item.quantity * item.unitPriceHT;
        doc.text(item.description, COL_X.desc, y, { width: 240 });
        doc.text(String(item.quantity), COL_X.qty, y);
        doc.text(`${item.unitPriceHT.toFixed(2)} €`, COL_X.price, y);
        doc.text(`${item.vatRatePercent}%`, COL_X.vat, y);
        doc.text(`${lineTotal.toFixed(2)} €`, COL_X.total, y);
        y += 18;
      }
      doc.moveTo(50, y + 4).lineTo(545, y + 4).strokeColor('#ccc').stroke();

      y += 16;
      doc.fontSize(10);
      doc.text(`Total HT : ${totals.totalHT.toFixed(2)} €`, 350, y, { align: 'right', width: 195 });
      y += 16;
      doc.text(`TVA : ${totals.totalVAT.toFixed(2)} €`, 350, y, { align: 'right', width: 195 });
      y += 16;
      doc.fontSize(12).text(`Total TTC : ${totals.totalTTC.toFixed(2)} €`, 350, y, { align: 'right', width: 195 });

      if (data.paymentInfo?.paidAt) {
        y += 24;
        const paidLabel = `Payé le ${data.paymentInfo.paidAt.toLocaleDateString('fr-FR')}${
          data.paymentInfo.paymentMethod ? ` (${data.paymentInfo.paymentMethod})` : ''
        }`;
        doc.fontSize(10).fillColor('#2a7a4a').text(paidLabel, 350, y, { align: 'right', width: 195 });
        doc.fillColor('#000');
      }

      if (data.notes) {
        doc.moveDown(2);
        doc.fontSize(9).fillColor('#555').text(data.notes);
        doc.fillColor('#000');
      }

      const mentions: string[] = [];
      if (data.kind === 'FACTURE') {
        mentions.push(
          'En cas de retard de paiement, une pénalité au taux de 3 fois le taux d’intérêt légal est exigible, ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 et D441-5 du Code de commerce).',
        );
      }
      if (company.iban) {
        mentions.push(`IBAN : ${company.iban}${company.bic ? ` — BIC : ${company.bic}` : ''}`);
      }
      if (mentions.length) {
        doc.fontSize(8).fillColor('#888').text(mentions.join('\n'), 50, 760, { width: 495, align: 'center' });
        doc.fillColor('#000');
      }

      doc.end();
    });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument): number {
    const tableTop = doc.y + 5;
    doc.fontSize(9).fillColor('#555');
    doc.text('Description', COL_X.desc, tableTop);
    doc.text('Qté', COL_X.qty, tableTop);
    doc.text('PU HT', COL_X.price, tableTop);
    doc.text('TVA', COL_X.vat, tableTop);
    doc.text('Total HT', COL_X.total, tableTop);
    doc.fillColor('#000');
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#ccc').stroke();
    return tableTop + 20;
  }
}
