import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const PREFIXES: Record<DocumentType, string> = {
  QUOTE: 'DEV',
  INVOICE: 'FACT',
};

@Injectable()
export class DocumentNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Numéro séquentiel annuel sans trou (ex: DEV-2026-0001, FACT-2026-0001).
   * L'incrément passe par une opération atomique Prisma (traduite en UPDATE SQL
   * unique côté Postgres) : deux créations concurrentes ne peuvent jamais obtenir
   * le même numéro, sans verrou manuel — même garantie que le verrou optimiste
   * déjà utilisé pour shift-swaps.accept() dans ce backend.
   */
  async next(type: DocumentType): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await this.prisma.documentSequence.upsert({
      where: { type_year: { type, year } },
      create: { type, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const padded = String(sequence.lastNumber).padStart(4, '0');
    return `${PREFIXES[type]}-${year}-${padded}`;
  }
}
