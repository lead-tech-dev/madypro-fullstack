import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LineItem } from '../../types/quote';
import { computeTotals, emptyLineItem } from '../../utils/lineItems';
import { Button } from '../ui/Button';

type LineItemsEditorProps = {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  disabled?: boolean;
};

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({ items, onChange, disabled }) => {
  const totals = computeTotals(items);

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="table-wrapper">
      <table className="table" aria-label="lignes du document">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>Prix unit. HT</th>
            <th>TVA %</th>
            <th>Total HT</th>
            {!disabled && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={item.description}
                  disabled={disabled}
                  placeholder="Description de la prestation"
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  style={{ width: '5rem' }}
                  value={item.quantity}
                  disabled={disabled}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  style={{ width: '6rem' }}
                  value={item.unitPriceHT}
                  disabled={disabled}
                  onChange={(e) => updateItem(index, { unitPriceHT: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  style={{ width: '4.5rem' }}
                  value={item.vatRatePercent}
                  disabled={disabled}
                  onChange={(e) => updateItem(index, { vatRatePercent: Number(e.target.value) })}
                />
              </td>
              <td>{((item.quantity || 0) * (item.unitPriceHT || 0)).toFixed(2)} €</td>
              {!disabled && (
                <td>
                  <Button
                    type="button"
                    variant="ghost"
                    className="btn--compact"
                    icon={Trash2}
                    aria-label="Supprimer la ligne"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="btn--compact"
          icon={Plus}
          onClick={() => onChange([...items, emptyLineItem()])}
        >
          Ajouter une ligne
        </Button>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '0.5rem' }}>
        <span>Total HT : {totals.totalHT.toFixed(2)} €</span>
        <span>TVA : {totals.totalVAT.toFixed(2)} €</span>
        <strong>Total TTC : {totals.totalTTC.toFixed(2)} €</strong>
      </div>
    </div>
  );
};
