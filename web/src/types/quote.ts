export type QuoteStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';

export type Quote = {
  id: string;
  siteId: string;
  site?: { name: string };
  interventionId?: string;
  label: string;
  amount: number;
  status: QuoteStatus;
  issuedAt: string;
  dueAt?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
};
