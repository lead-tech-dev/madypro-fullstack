import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { Quote, QuoteStatus } from '../../types/quote';
import { listQuotes, createQuote, setQuoteStatus, deleteQuote, CreateQuotePayload } from '../../services/api/quotes.api';
import { listSites } from '../../services/api/sites.api';
import { Site } from '../../types/site';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/datetime';

const STATUS_OPTIONS: { value: QuoteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SENT', label: 'Envoyé' },
  { value: 'PAID', label: 'Payé' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

const NEXT_STATUS: Record<QuoteStatus, QuoteStatus | null> = {
  DRAFT: 'SENT',
  SENT: 'PAID',
  PAID: null,
  CANCELLED: null,
};

const defaultForm: CreateQuotePayload = { siteId: '', label: '', amount: 0, dueAt: '' };

export const QuotesPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ siteId: string; status: QuoteStatus | 'all' }>({ siteId: 'all', status: 'all' });
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<CreateQuotePayload>(defaultForm);
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listQuotes(token, filters.siteId !== 'all' ? filters.siteId : undefined)
      .then(setQuotes)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les devis', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, filters.siteId]);

  useEffect(() => {
    if (!token) return;
    listSites(token, { pageSize: 200 })
      .then((data) => setSites(data.items))
      .catch(() => setSites([]));
  }, [token]);

  const filteredQuotes = useMemo(
    () => quotes.filter((quote) => filters.status === 'all' || quote.status === filters.status),
    [quotes, filters.status],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !form.siteId || !form.label.trim() || form.amount <= 0) {
      notify('Site, libellé et montant requis', 'error');
      return;
    }
    setCreating(true);
    try {
      await createQuote(token, { ...form, label: form.label.trim(), dueAt: form.dueAt || undefined });
      notify('Devis créé');
      setForm(defaultForm);
      setFormVisible(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Création impossible', 'error');
    } finally {
      setCreating(false);
    }
  };

  const advanceStatus = async (quote: Quote) => {
    if (!token) return;
    const next = NEXT_STATUS[quote.status];
    if (!next) return;
    try {
      await setQuoteStatus(token, quote.id, next);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Mise à jour impossible', 'error');
    }
  };

  const cancelQuote = async (quote: Quote) => {
    if (!token) return;
    try {
      await setQuoteStatus(token, quote.id, 'CANCELLED');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Annulation impossible', 'error');
    }
  };

  const removeQuote = async (quote: Quote) => {
    if (!token) return;
    try {
      await deleteQuote(token, quote.id);
      notify('Devis supprimé');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Suppression impossible', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="pill">Devis & facturation</span>
        <h2>Devis clients</h2>
        <p>Suivez vos devis du brouillon jusqu’au paiement.</p>
        <Button type="button" onClick={() => setFormVisible((v) => !v)}>
          {formVisible ? 'Fermer' : 'Nouveau devis'}
        </Button>
      </div>

      <div className="filter-grid" role="search">
        <label className="filter-field filter-card">
          Site
          <select value={filters.siteId} onChange={(event) => setFilters((prev) => ({ ...prev, siteId: event.target.value }))}>
            <option value="all">Tous les sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Statut
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as QuoteStatus | 'all' }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {formVisible && (
        <form className="form-card" onSubmit={handleCreate} style={{ marginBottom: '1.5rem' }}>
          <Select
            id="quoteSite"
            label="Site"
            options={sites.map((site) => ({ value: site.id, label: site.name }))}
            value={form.siteId}
            onChange={(event) => setForm((prev) => ({ ...prev, siteId: event.target.value }))}
          />
          <Input
            id="quoteLabel"
            label="Libellé"
            placeholder="Nettoyage de fin de chantier"
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
          <div className="form-row">
            <Input
              id="quoteAmount"
              label="Montant (€)"
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
            />
            <Input
              id="quoteDueAt"
              label="Échéance"
              type="date"
              value={form.dueAt}
              onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
            />
          </div>
          <div className="form-actions">
            <Button type="submit" disabled={creating}>
              {creating ? 'Création...' : 'Créer le devis'}
            </Button>
          </div>
        </form>
      )}

      <section className="panel">
        <h3>Devis</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : filteredQuotes.length === 0 ? (
          <p className="card__meta">Aucun devis.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="devis">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Libellé</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Échéance</th>
                  <th>Émis le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>{quote.site?.name ?? quote.siteId}</td>
                    <td>{quote.label}</td>
                    <td>{quote.amount.toFixed(2)} €</td>
                    <td>
                      <span
                        className={`status-chip ${
                          quote.status === 'PAID'
                            ? 'status-chip--success'
                            : quote.status === 'CANCELLED'
                            ? 'status-chip--info'
                            : 'status-chip--warning'
                        }`}
                      >
                        {STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td>{quote.dueAt ? quote.dueAt.slice(0, 10) : '—'}</td>
                    <td>{formatDateTime(quote.issuedAt)}</td>
                    <td>
                      <div className="table-actions">
                        {NEXT_STATUS[quote.status] && (
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => advanceStatus(quote)}>
                            {quote.status === 'DRAFT' ? 'Marquer envoyé' : 'Marquer payé'}
                          </Button>
                        )}
                        {quote.status !== 'CANCELLED' && quote.status !== 'PAID' && (
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => cancelQuote(quote)}>
                            Annuler
                          </Button>
                        )}
                        <Button type="button" variant="ghost" className="btn--compact" onClick={() => removeQuote(quote)}>
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
