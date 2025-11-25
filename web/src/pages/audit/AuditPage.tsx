import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { AuditLog, AuditAction } from '../../types/audit';
import { listAuditLogs, AuditPage as AuditPageType } from '../../services/api/audit.api';
import { Input } from '../../components/ui/Input';
import { formatDateTime } from '../../utils/datetime';

const ACTION_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'CREATE_NOTIFICATION', label: 'Notification envoyée' },
  { value: 'CREATE_ABSENCE', label: 'Création absence' },
  { value: 'UPDATE_ABSENCE_STATUS', label: 'Validation absence' },
  { value: 'CREATE_MANUAL_ATTENDANCE', label: 'Pointage manuel' },
  { value: 'UPDATE_ATTENDANCE', label: 'Maj pointage' },
  { value: 'CANCEL_ATTENDANCE', label: 'Annulation pointage' },
  { value: 'UPDATE_SETTINGS', label: 'Paramètres' },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const today = new Date();

export const AuditPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [pageData, setPageData] = useState<AuditPageType>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    actorId: '',
    action: 'all' as AuditAction | 'all',
    startDate: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
    endDate: formatDate(today),
  });

  const fetchLogs = () => {
    if (!token) return;
    setLoading(true);
    listAuditLogs(token, { ...filters, page, pageSize })
      .then((data) => setPageData(data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les logs';
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [token, filters.startDate, filters.endDate, filters.actorId, filters.action, page, pageSize]);

  return (
    <div className="audit-page">
      <div className="page-header">
        <span className="pill">Audit</span>
        <h2>Historique des actions sensibles</h2>
        <p>Suivez qui a modifié quoi dans l’écosystème Madypro Clean.</p>
      </div>

      <div className="filter-grid" role="search">
        <Input
          id="actorFilter"
          name="actorId"
          label="Utilisateur (email/id)"
          value={filters.actorId}
          onChange={(event) => {
            setFilters((prev) => ({ ...prev, actorId: event.target.value }));
            setPage(1);
          }}
          placeholder="admin@madyproclean.com"
        />
        <label className="filter-field filter-card">
          Action
          <select
            value={filters.action}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, action: event.target.value as AuditAction | 'all' }));
              setPage(1);
            }}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Début
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, startDate: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <label className="filter-field filter-card">
          Fin
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, endDate: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <div className="pagination">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </button>
          <span className="card__meta">Page {page}</span>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              const maxPage = Math.ceil(pageData.total / pageSize) || 1;
              setPage((p) => (p < maxPage ? p + 1 : p));
            }}
            disabled={page * pageSize >= pageData.total}
          >
            Suivant
          </button>
          <span className="card__meta">{pageData.total} résultats</span>
        </div>
      </div>

      <section className="panel">
        <h3>Journal des actions</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="journal des actions">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.actorId}</td>
                    <td>{log.action}</td>
                    <td>
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ''}
                    </td>
                    <td>{log.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="pagination" style={{ marginTop: '1rem' }}>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Précédent
        </button>
        <span className="card__meta">Page {page}</span>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => {
            const maxPage = Math.ceil(pageData.total / pageSize) || 1;
            setPage((p) => (p < maxPage ? p + 1 : p));
          }}
          disabled={page * pageSize >= pageData.total}
        >
          Suivant
        </button>
        <span className="card__meta">{pageData.total} résultats</span>
      </div>
    </div>
  );
};
