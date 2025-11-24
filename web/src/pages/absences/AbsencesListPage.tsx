import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listAbsences,
  createManualAbsence,
  updateAbsenceStatus,
  AbsenceFilters,
  ManualAbsencePayload,
  AbsencePage,
} from '../../services/api/absences.api';
import { Absence, AbsenceStatus, AbsenceType } from '../../types/absence';
import { listUsers } from '../../services/api/users.api';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { User } from '../../types/user';

const TYPE_OPTIONS: { value: AbsenceType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  { value: 'SICK', label: 'Arrêt maladie' },
  { value: 'PAID_LEAVE', label: 'Congés payés' },
  { value: 'UNPAID', label: 'Sans solde' },
  { value: 'OTHER', label: 'Autre' },
];

const STATUS_OPTIONS: { value: AbsenceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvé' },
  { value: 'REJECTED', label: 'Rejeté' },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const initialFilters = () => ({
  startDate: formatDate(new Date(new Date().setMonth(new Date().getMonth() - 1))),
  endDate: formatDate(new Date()),
  agentId: 'all',
  type: 'all' as AbsenceType | 'all',
  status: 'all' as AbsenceStatus | 'all',
});

type ManualFormState = {
  userId: string;
  type: AbsenceType;
  from: string;
  to: string;
  reason: string;
  note: string;
};

const EMPTY_MANUAL_FORM: ManualFormState = {
  userId: '',
  type: 'SICK',
  from: formatDate(new Date()),
  to: formatDate(new Date()),
  reason: '',
  note: '',
};

export const AbsencesListPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [pageData, setPageData] = useState<AbsencePage>({
    items: [],
    total: 0,
    page: 1,
    pageSize,
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [manualForm, setManualForm] = useState<ManualFormState>(EMPTY_MANUAL_FORM);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    listUsers(token, { role: 'AGENT', status: 'active' })
      .then((usersPage) => {
        const agentItems = usersPage.items ?? (usersPage as any as User[]);
        setAgents(agentItems);
        setManualForm((prev) => ({ ...prev, userId: prev.userId || agentItems[0]?.id || '' }));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les agents';
        setError(message);
        notify(message, 'error');
      });
  }, [token, notify]);

  const fetchAbsences = () => {
    if (!token) return;
    setLoading(true);
    const query: AbsenceFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      agentId: filters.agentId,
      type: filters.type,
      status: filters.status,
      page,
      pageSize,
    };
    listAbsences(token, query)
      .then((data) => {
        setPageData(data);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les absences';
        setError(message);
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAbsences();
  }, [token, filters.startDate, filters.endDate, filters.agentId, filters.type, filters.status, page, pageSize]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const agentOptions = useMemo(
    () => [{ value: 'all', label: 'Tous les agents' }].concat(
      agents.map((agent) => ({ value: agent.id, label: agent.name }))
    ),
    [agents]
  );

  const handleManualChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!manualForm.userId || !manualForm.reason.trim()) {
      notify('Sélectionnez un agent et renseignez le motif', 'error');
      return;
    }
    const payload: ManualAbsencePayload = {
      userId: manualForm.userId,
      type: manualForm.type,
      from: manualForm.from,
      to: manualForm.to,
      reason: manualForm.reason,
      note: manualForm.note,
    };
    setManualSubmitting(true);
    try {
      await createManualAbsence(token, payload);
      notify('Absence saisie');
      setManualForm((prev) => ({ ...prev, reason: '', note: '' }));
      fetchAbsences();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de la création';
      notify(message, 'error');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleDecision = async (absence: Absence, status: AbsenceStatus) => {
    if (!token) return;
    const comment = window.prompt('Commentaire (optionnel) ?') ?? undefined;
    try {
      await updateAbsenceStatus(token, absence.id, {
        status,
        validatedBy: 'Admin Madypro',
        comment,
      });
      notify(status === 'APPROVED' ? 'Demande approuvée' : 'Demande rejetée');
      fetchAbsences();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action impossible';
      notify(message, 'error');
    }
  };

  const statusClass = (status: AbsenceStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'status-chip--success';
      case 'PENDING':
        return 'status-chip--warning';
      default:
        return 'status-chip--info';
    }
  };

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Absences & congés</span>
          <h2>Gardez la main sur la disponibilité</h2>
          <p>
            Validez les demandes, saisissez les absences terrain et synchronisez la paie avec la réalité
            opérationnelle Madypro Clean.
          </p>
          <Button
            type="button"
            onClick={() => {
              setManualForm(EMPTY_MANUAL_FORM);
              setManualOpen(true);
            }}
          >
            Créer une absence manuelle
          </Button>
        </div>
        <div className="page-hero__accent">
          <h3>Indicateurs</h3>
          <ul className="list-line">
            <li>
              Demandés <span>{pageData.items.filter((item) => item.status === 'PENDING').length}</span>
            </li>
            <li>
              Validés <span>{pageData.items.filter((item) => item.status === 'APPROVED').length}</span>
            </li>
            <li>
              Manuels <span>{pageData.items.filter((item) => item.manual).length}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="filter-grid" role="search">
        <label className="filter-field filter-card">
          Début
          <input type="date" value={filters.startDate} onChange={(event) => handleFilterChange('startDate', event.target.value)} />
        </label>
        <label className="filter-field filter-card">
          Fin
          <input type="date" value={filters.endDate} onChange={(event) => handleFilterChange('endDate', event.target.value)} />
        </label>
        <label className="filter-field filter-card">
          Agent
          <select value={filters.agentId} onChange={(event) => handleFilterChange('agentId', event.target.value)}>
            {agentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Type
          <select value={filters.type} onChange={(event) => handleFilterChange('type', event.target.value)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Statut
          <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="pagination">
          <Button type="button" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Précédent
          </Button>
          <span className="card__meta">Page {page}</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const maxPage = Math.ceil(pageData.total / pageSize) || 1;
              setPage((p) => (p < maxPage ? p + 1 : p));
            }}
            disabled={page * pageSize >= pageData.total}
          >
            Suivant
          </Button>
          <span className="card__meta">{pageData.total} résultats</span>
        </div>
      </div>

      {manualOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 20%, rgba(68,174,248,0.08), transparent 25%), rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '760px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              border: '1px solid #eef1f4',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Absence</span>
                <h3 style={{ margin: 0 }}>Absence manuelle</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setManualForm(EMPTY_MANUAL_FORM)}
                >
                  Réinitialiser
                </Button>
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>

            <form
              className="form-card"
              onSubmit={submitManual}
              style={{ boxShadow: 'none', padding: '0.75rem', marginTop: '1rem', display: 'grid', gap: '1rem' }}
            >
              <Select
                id="manualAgent"
                name="userId"
                label="Agent"
                options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
                value={manualForm.userId}
                onChange={handleManualChange}
              />
              <Select
                id="manualType"
                name="type"
                label="Type"
                options={TYPE_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={manualForm.type}
                onChange={handleManualChange}
              />
              <div className="form-row">
                <Input id="manualFrom" name="from" label="Du" type="date" value={manualForm.from} onChange={handleManualChange} required />
                <Input id="manualTo" name="to" label="Au" type="date" value={manualForm.to} onChange={handleManualChange} required />
              </div>
              <Input
                id="manualReason"
                name="reason"
                label="Motif"
                value={manualForm.reason}
                onChange={handleManualChange}
                placeholder="Motif officiel"
                required
              />
              <label className="form-field" htmlFor="manualNote">
                <span>Note interne</span>
                <textarea id="manualNote" name="note" value={manualForm.note} onChange={handleManualChange} placeholder="Commentaire interne" />
              </label>
              <div className="form-actions">
                <Button type="submit" disabled={manualSubmitting}>
                  {manualSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <h3>Demandes d'absence</h3>
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="absences déclarées">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Motif</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((absence) => (
                  <tr key={absence.id}>
                    <td>
                      <Link to={`/absences/${absence.id}`}>{absence.agent.name}</Link>
                    </td>
                    <td>{TYPE_OPTIONS.find((option) => option.value === absence.type)?.label ?? absence.type}</td>
                    <td>
                      {absence.from} → {absence.to}
                    </td>
                    <td>{absence.reason}</td>
                    <td>
                      <span className={`status-chip ${statusClass(absence.status)}`}>{absence.status}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/absences/${absence.id}`} className="btn btn--ghost btn--compact">
                          Détails
                        </Link>
                        {absence.status === 'PENDING' && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              className="btn--compact"
                              onClick={() => handleDecision(absence, 'APPROVED')}
                            >
                              Approuver
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="btn--compact"
                              onClick={() => handleDecision(absence, 'REJECTED')}
                            >
                              Rejeter
                            </Button>
                          </>
                        )}
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
