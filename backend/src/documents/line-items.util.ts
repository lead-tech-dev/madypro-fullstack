export type LineItemLike = {
  quantity: number;
  unitPriceHT: number;
  vatRatePercent: number;
};

export type DocumentTotals = {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Totaux HT/TVA/TTC calculés à la volée depuis les lignes — jamais stockés en
 * dur sur le devis/la facture, pour ne jamais diverger si une ligne est
 * éditée avant émission (source unique de vérité : les lignes elles-mêmes).
 */
export function computeTotals(lineItems: LineItemLike[]): DocumentTotals {
  let totalHT = 0;
  let totalVAT = 0;
  for (const item of lineItems) {
    const lineHT = item.quantity * item.unitPriceHT;
    totalHT += lineHT;
    totalVAT += lineHT * (item.vatRatePercent / 100);
  }
  return {
    totalHT: round2(totalHT),
    totalVAT: round2(totalVAT),
    totalTTC: round2(totalHT + totalVAT),
  };
}
