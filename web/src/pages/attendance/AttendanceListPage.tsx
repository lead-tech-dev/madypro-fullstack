import React, { useEffect, useMemo, useState } from 'react';
import {
  listAttendance,
  createManualAttendance,
  updateAttendance,
  cancelAttendance,
  AttendanceFilters,
  ManualAttendancePayload,
  UpdateAttendancePayload,
} from '../../services/api/attendance.api';
import { Attendance, AttendanceStatus } from '../../types/attendance';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthContext } from '../../context/AuthContext';
import { listUsers } from '../../services/api/users.api';
import { listSites } from '../../services/api/sites.api';
import { listClients } from '../../services/api/clients.api';
import { listInterventions } from '../../services/api/interventions.api';
import { User } from '../../types/user';
import { Site } from '../../types/site';
import { Client } from '../../types/client';
import { Intervention } from '../../types/intervention';

const today = new Date();
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const startOfWindow = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'COMPLETED', label: 'Validé' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const initialManualForm = {
  userId: '',
  interventionId: '',
  siteId: '',
  date: formatDate(today),
  checkInTime: '08:00',
  checkOutTime: '16:00',
  note: '',
};

type ManualFormState = typeof initialManualForm;

type FilterState = {
  startDate: string;
  endDate: string;
  agentId: string;
  siteId: string;
  clientId: string;
  status: AttendanceStatus | 'all';
};

const createFilters = (): FilterState => ({
  startDate: formatDate(startOfWindow),
  endDate: formatDate(today),
  agentId: 'all',
  siteId: 'all',
  clientId: 'all',
  status: 'all',
});

export const AttendanceListPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState<FilterState>(createFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<{
    agents: User[];
    sites: Site[];
    clients: Client[];
    interventions: Intervention[];
  }>({ agents: [], sites: [], clients: [], interventions: [] });
  const [manualForm, setManualForm] = useState<ManualFormState>(initialManualForm);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [editForm, setEditForm] = useState<{ checkInTime: string; checkOutTime: string; note: string }>(
    { checkInTime: '', checkOutTime: '', note: '' }
  );
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      listUsers(token, { role: 'AGENT', status: 'active' }),
      listSites(token),
      listClients(token),
      listInterventions(token, {
        status: 'COMPLETED',
        type: 'all',
        startDate: formatDate(startOfWindow),
        endDate: formatDate(today),
      }),
    ])
      .then(([agentsPage, sitePage, clients, interventionsPage]) => {
        const agents = Array.isArray((agentsPage as any)?.items)
          ? (agentsPage as any).items
          : Array.isArray(agentsPage as any)
          ? (agentsPage as any)
          : [];
        const sites = Array.isArray((sitePage as any)?.items)
          ? (sitePage as any).items
          : Array.isArray(sitePage as any)
          ? (sitePage as any)
          : [];
        const interventions = Array.isArray((interventionsPage as any)?.items)
          ? (interventionsPage as any).items
          : Array.isArray(interventionsPage as any)
          ? (interventionsPage as any)
          : [];
        setOptions({ agents, sites, clients, interventions });
        const firstIntervention = interventions[0];
        setManualForm((prev) => ({
          ...prev,
          userId: prev.userId || firstIntervention?.agentIds[0] || agents[0]?.id || '',
          siteId: prev.siteId || firstIntervention?.siteId || sites[0]?.id || '',
          interventionId: prev.interventionId || firstIntervention?.id || '',
          date: firstIntervention?.date ?? prev.date,
          checkInTime: firstIntervention?.startTime ?? prev.checkInTime,
          checkOutTime: firstIntervention?.endTime ?? prev.checkOutTime,
        }));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les référentiels';
        setError(message);
        notify(message, 'error');
      });
  }, [token, notify]);

  const fetchAttendance = () => {
    if (!token) return;
    setLoading(true);
    const apiFilters: AttendanceFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      agentId: filters.agentId,
      siteId: filters.siteId,
      clientId: filters.clientId,
      status: filters.status,
      page,
      pageSize,
    };
    listAttendance(token, apiFilters)
      .then((data) => {
        setRecords(data.items);
        setTotal(data.total);
        setError(null);
        if (selected) {
          const refreshed = data.items.find((entry) => entry.id === selected.id);
          if (refreshed) {
            setSelected(refreshed);
            setEditForm({
              checkInTime: refreshed.checkInTime ?? '',
              checkOutTime: refreshed.checkOutTime ?? '',
              note: refreshed.note ?? '',
            });
          }
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les pointages';
        setError(message);
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendance();
  }, [token, filters.startDate, filters.endDate, filters.agentId, filters.siteId, filters.clientId, filters.status, page]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleManualChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!manualForm.userId || !manualForm.siteId || !manualForm.note.trim()) {
      notify('Veuillez remplir tous les champs requis', 'error');
      return;
    }
    setManualSubmitting(true);
    const payload: ManualAttendancePayload = {
      userId: manualForm.userId,
      siteId: manualForm.siteId,
      date: manualForm.date,
      checkInTime: manualForm.checkInTime,
      checkOutTime: manualForm.checkOutTime,
      note: manualForm.note.trim(),
    };
    try {
      await createManualAttendance(token, payload);
      notify('Pointage manuel créé');
      setManualForm((prev) => ({ ...prev, note: '' }));
      fetchAttendance();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Création impossible';
      notify(message, 'error');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleSelectRecord = (record: Attendance) => {
    setSelected(record);
    setEditForm({
      checkInTime: record.checkInTime ?? '',
      checkOutTime: record.checkOutTime ?? '',
      note: record.note ?? '',
    });
  };

  const handleEditChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdition = async () => {
    if (!token || !selected) return;
    const payload: UpdateAttendancePayload = {
      checkInTime: editForm.checkInTime || undefined,
      checkOutTime: editForm.checkOutTime || undefined,
      note: editForm.note,
    };
    setEditSubmitting(true);
    try {
      await updateAttendance(token, selected.id, payload);
      notify('Pointage mis à jour');
      fetchAttendance();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Modification impossible';
      notify(message, 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const cancelRecord = async (record: Attendance) => {
    if (!token) return;
    const reason = window.prompt("Motif de l'annulation ?");
    if (reason === null) return;
    try {
      await cancelAttendance(token, record.id, reason || undefined);
      notify('Pointage annulé');
      fetchAttendance();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Annulation impossible';
      notify(message, 'error');
    }
  };

  const agentOptions = useMemo(
    () => [{ value: 'all', label: 'Tous les agents' }].concat(
      options.agents.map((agent) => ({ value: agent.id, label: agent.name }))
    ),
    [options.agents]
  );

  const siteOptions = useMemo(
    () => [{ value: 'all', label: 'Tous les sites' }].concat(
      options.sites.map((site) => ({ value: site.id, label: `${site.name} · ${site.clientName}` }))
    ),
    [options.sites]
  );

  const clientOptions = useMemo(
    () => [{ value: 'all', label: 'Tous les clients' }].concat(
      options.clients.map((client) => ({ value: client.id, label: client.name }))
    ),
    [options.clients]
  );

  const manualAgentOptions = options.agents.map((agent) => ({ value: agent.id, label: agent.name }));
  const manualInterventionOptions = options.interventions.map((intervention) => ({
    value: intervention.id,
    label: `${intervention.date} · ${intervention.siteName} (${intervention.startTime}-${intervention.endTime})`,
  }));

  const groupedByAgent = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    records.forEach((rec) => {
      const current = map.get(rec.agent.id) ?? { name: rec.agent.name, total: 0 };
      current.total += 1;
      map.set(rec.agent.id, current);
    });
    return Array.from(map.values());
  }, [records]);

  const durationLabel = (duration?: number) =>
    typeof duration === 'number' ? `${Math.floor(duration / 60)}h${(duration % 60).toString().padStart(2, '0')}` : '—';

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Suivi des pointages</span>
          <h2>Contrôlez les présences terrain</h2>
          <p>Visualisez, corrigez ou créez les pointages agents / superviseurs pour sécuriser la paie.</p>
          <Button
            type="button"
            onClick={() => {
              setManualForm(initialManualForm);
              setManualOpen(true);
            }}
          >
            Créer un pointage manuel
          </Button>
        </div>
        <div className="page-hero__accent">
          <h3>À surveiller</h3>
          <ul className="list-line">
            {(() => {
              const alerts = records
                .filter((r) => r.status === 'PENDING' || r.status === 'CANCELLED' || r.manual)
                .sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''))
                .slice(0, 5);
              if (!alerts.length) {
                return <li>Aucune alerte.</li>;
              }
              return alerts.map((att) => {
                const flag =
                  att.status === 'CANCELLED'
                    ? 'Annulé'
                    : att.manual
                    ? 'Manuel'
                    : 'En cours';
                const time = att.checkInTime ?? att.plannedStart ?? '—';
                return (
                  <li key={att.id}>
                    {att.agent.name} · {att.site.name} <span>{flag} · {time}</span>
                  </li>
                );
              });
            })()}
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
          Site
          <select value={filters.siteId} onChange={(event) => handleFilterChange('siteId', event.target.value)}>
            {siteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Client
          <select value={filters.clientId} onChange={(event) => handleFilterChange('clientId', event.target.value)}>
            {clientOptions.map((option) => (
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
              const maxPage = Math.ceil(total / pageSize) || 1;
              setPage((p) => (p < maxPage ? p + 1 : p));
            }}
            disabled={page * pageSize >= total}
          >
            Suivant
          </Button>
          <span className="card__meta">{total} résultats</span>
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
                <span className="pill">Pointage</span>
                <h3 style={{ margin: 0 }}>Pointage manuel</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={() => setManualForm(initialManualForm)}>
                  Réinitialiser
                </Button>
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>

            <form
              className="form-card"
              onSubmit={handleManualSubmit}
              style={{ boxShadow: 'none', padding: '0.75rem', marginTop: '1rem', display: 'grid', gap: '1rem' }}
            >
              <Select
                id="manualUser"
                name="userId"
                label="Agent"
                options={manualAgentOptions}
                value={manualForm.userId}
              onChange={handleManualChange}
            />
              <label className="form-field">
                <span>Intervention terminée</span>
                <select
                  value={manualForm.interventionId}
                  onChange={(event) => {
                    const value = event.target.value;
                    const intervention = options.interventions.find((item) => item.id === value);
                    setManualForm((prev) => ({
                      ...prev,
                      interventionId: value,
                      siteId: intervention?.siteId ?? prev.siteId,
                      userId: intervention?.agents[0]?.id ?? prev.userId,
                      date: intervention?.date ?? prev.date,
                      checkInTime: intervention?.startTime ?? prev.checkInTime,
                      checkOutTime: intervention?.endTime ?? prev.checkOutTime,
                    }));
                  }}
                >
                  <option value="">Sélectionner une intervention</option>
                  {manualInterventionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                id="manualDate"
                name="date"
                label="Date"
                type="date"
                value={manualForm.date}
                onChange={handleManualChange}
                required
              />
              <div className="form-row">
                <Input
                  id="manualCheckIn"
                  name="checkInTime"
                  label="Heure d'arrivée"
                  type="time"
                  value={manualForm.checkInTime}
                  onChange={handleManualChange}
                  required
                />
                <Input
                  id="manualCheckOut"
                  name="checkOutTime"
                  label="Heure de départ"
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={handleManualChange}
                  required
                />
              </div>
              <label className="form-field" htmlFor="manualNote">
                <span>Note</span>
                <textarea
                  id="manualNote"
                  name="note"
                  required
                  value={manualForm.note}
                  onChange={handleManualChange}
                  placeholder="Motif de la création manuelle"
                />
              </label>
              <div className="form-actions">
                <Button type="submit" disabled={manualSubmitting}>
                  {manualSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)} style={{ marginLeft: '0.5rem' }}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <h3>Liste des pointages</h3>
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <Table
              headers={[
                'Date',
                'Agent',
                'Site',
                'Client',
                'Arrivée',
                'Départ',
                'Durée',
                'Statut',
                'Actions',
              ]}
              ariaLabel="liste des pointages"
            >
              {records.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>{entry.agent.name}</td>
                  <td>{entry.site.name}</td>
                  <td>{entry.site.clientName}</td>
                  <td>{entry.checkInTime ?? '—'}</td>
                  <td>{entry.checkOutTime ?? '—'}</td>
                  <td>{durationLabel(entry.durationMinutes)}</td>
                  <td>
                    <span
                      className={`status-chip ${
                        entry.status === 'COMPLETED'
                          ? 'status-chip--success'
                          : entry.status === 'PENDING'
                          ? 'status-chip--warning'
                          : 'status-chip--info'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button type="button" variant="ghost" className="btn--compact" onClick={() => handleSelectRecord(entry)}>
                        Détails
                      </Button>
                      {entry.status !== 'CANCELLED' && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          onClick={() => cancelRecord(entry)}
                        >
                          Annuler
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </section>

      {!loading && groupedByAgent.length > 0 && (
        <section className="panel">
          <h3>Pointages par agent</h3>
          <div className="table-wrapper">
            <table className="table" aria-label="pointages par agent">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Nombre de pointages</th>
                </tr>
              </thead>
              <tbody>
                {groupedByAgent.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <section className="panel">
          <h3>Détail du pointage</h3>
          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>Agent</span>
              <strong>{selected.agent.name}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Site</span>
              <strong>{selected.site.name}</strong>
              <small>{selected.site.clientName}</small>
            </div>
            <div className="detail-grid__item">
              <span>Planifié</span>
              <strong>{selected.plannedStart ?? '—'} / {selected.plannedEnd ?? '—'}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Réel</span>
              <strong>{selected.checkInTime ?? '—'} / {selected.checkOutTime ?? '—'}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Durée</span>
              <strong>{durationLabel(selected.durationMinutes)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Origine</span>
              <strong>{selected.manual ? 'Créé manuellement' : `Créé par ${selected.createdBy}`}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>GPS arrivée</span>
              {selected.gps.checkIn ? (
                <>
                  <strong>
                    {selected.gps.checkIn.latitude.toFixed(4)}, {selected.gps.checkIn.longitude.toFixed(4)}
                  </strong>
                  <small>
                    {selected.gps.checkIn.distanceMeters !== undefined
                      ? `${selected.gps.checkIn.distanceMeters} m du site`
                      : 'Distance inconnue'}
                  </small>
                </>
              ) : (
                <strong>—</strong>
              )}
            </div>
            <div className="detail-grid__item">
              <span>GPS départ</span>
              {selected.gps.checkOut ? (
                <>
                  <strong>
                    {selected.gps.checkOut.latitude.toFixed(4)}, {selected.gps.checkOut.longitude.toFixed(4)}
                  </strong>
                  <small>
                    {selected.gps.checkOut.distanceMeters !== undefined
                      ? `${selected.gps.checkOut.distanceMeters} m du site`
                      : 'Distance inconnue'}
                  </small>
                </>
              ) : (
                <strong>—</strong>
              )}
            </div>
          </div>

          <label className="form-field" htmlFor="editNote">
            <span>Note</span>
            <textarea id="editNote" name="note" value={editForm.note} onChange={handleEditChange} />
          </label>

          <div className="form-row">
            <Input
              id="editCheckIn"
              name="checkInTime"
              label="Heure d'arrivée"
              type="time"
              value={editForm.checkInTime}
              onChange={handleEditChange}
            />
            <Input
              id="editCheckOut"
              name="checkOutTime"
              label="Heure de départ"
              type="time"
              value={editForm.checkOutTime}
              onChange={handleEditChange}
            />
          </div>

          <div className="form-actions">
            <Button type="button" onClick={saveEdition} disabled={editSubmitting}>
              {editSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
            </Button>
            {selected.status !== 'CANCELLED' && (
              <Button type="button" variant="ghost" onClick={() => cancelRecord(selected)}>
                Annuler le pointage
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
