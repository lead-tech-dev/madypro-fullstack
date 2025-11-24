import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { Intervention, InterventionStatus, InterventionType } from '../../types/intervention';
import {
  listInterventions,
  createIntervention,
  updateIntervention,
  duplicateIntervention,
  cancelIntervention,
  InterventionFilters,
  CreateInterventionPayload,
} from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { listUsers } from '../../services/api/users.api';
import { listClients } from '../../services/api/clients.api';
import { listAnomalies, createAnomaly, updateAnomalyStatus } from '../../services/api/anomalies.api';
import { Site } from '../../types/site';
import { User } from '../../types/user';
import { Client } from '../../types/client';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { listAttendance } from '../../services/api/attendance.api';
import { Attendance } from '../../types/attendance';
import { Anomaly } from '../../types/anomaly';

const STATUS_OPTIONS: { value: InterventionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'PLANNED', label: 'Planifiée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'NEEDS_REVIEW', label: 'À valider' },
  { value: 'CANCELLED', label: 'Annulée' },
  { value: 'NO_SHOW', label: 'Non effectuée' },
];

const TYPE_OPTIONS: { value: InterventionType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'REGULAR', label: 'Régulier' },
  { value: 'PONCTUAL', label: 'Ponctuel' },
];

const PONCTUAL_SUBTYPES = [
  'Privat',
  'Hivernage terrasse',
  'Enlèvement de la terrasse',
  'Enlèvement console',
  'Nettoyage cuisine',
  'Débarras',
  'Remise de la terrasse',
  'Nettoyage de fin de chantier',
  'Manutention',
];

const today = new Date();
const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const defaultFilters = () => ({
  startDate: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
  endDate: formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
  type: 'all' as InterventionType | 'all',
  subType: '',
  siteId: 'all',
  clientId: 'all',
  agentId: 'all',
  status: 'all' as InterventionStatus | 'all',
});

const createFormDefaults: CreateInterventionPayload = {
  type: 'REGULAR',
  siteId: '',
  date: formatDate(today),
  startTime: '08:00',
  endTime: '10:00',
  agentIds: [],
  truckLabels: [],
  label: '',
  subType: undefined,
  observation: '',
};

export const InterventionsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateInterventionPayload>(createFormDefaults);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [observationOnly, setObservationOnly] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [viewing, setViewing] = useState<Intervention | null>(null);
  const [modalObservation, setModalObservation] = useState('');
  const [savingObservation, setSavingObservation] = useState(false);
  const [viewAttendances, setViewAttendances] = useState<Attendance[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyForm, setAnomalyForm] = useState({ type: '', title: '', description: '' });
  const [savingAnomaly, setSavingAnomaly] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const attendanceByAgent = React.useMemo(() => {
    const map = new Map<string, Attendance>();
    viewAttendances.forEach((att) => {
      if (!map.has(att.agent.id)) {
        map.set(att.agent.id, att);
      }
    });
    return Array.from(map.values());
  }, [viewAttendances]);

  const openCreateForm = () => {
    setObservationOnly(false);
    setEditingId(null);
    setForm({
      ...createFormDefaults,
      date: formatDate(new Date()),
      siteId: '',
      agentIds: [],
      truckLabels: [],
      label: '',
      observation: '',
      subType: undefined,
    });
    setFormVisible(true);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([listSites(token), listClients(token), listUsers(token, { role: 'AGENT', status: 'active' })])
      .then(([sitePage, clientData, userData]) => {
        const siteItems = Array.isArray((sitePage as any)?.items)
          ? (sitePage as any).items
          : Array.isArray(sitePage as any)
          ? (sitePage as any)
          : [];
        const clientItems = Array.isArray((clientData as any)?.items)
          ? (clientData as any).items
          : Array.isArray(clientData as any)
          ? (clientData as any)
          : [];
        const agentItems = Array.isArray((userData as any)?.items)
          ? (userData as any).items
          : Array.isArray(userData as any)
          ? (userData as any)
          : [];
        setSites(siteItems);
        setClients(clientItems);
        setUsers(agentItems);
        setForm((prev) => ({
          ...prev,
          siteId: prev.siteId || siteItems[0]?.id || '',
          agentIds: prev.agentIds.length ? prev.agentIds : agentItems[0] ? [agentItems[0].id] : [],
        }));
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les référentiels', 'error'));
  }, [token, notify]);

  const fetchInterventions = () => {
    if (!token) return;
    setLoading(true);
    const query: InterventionFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      siteId: filters.siteId !== 'all' ? filters.siteId : undefined,
      clientId: filters.clientId !== 'all' ? filters.clientId : undefined,
      type: filters.type,
      subType: filters.subType || undefined,
      agentId: filters.agentId !== 'all' ? filters.agentId : undefined,
      status: filters.status,
      page,
      pageSize,
    };
    listInterventions(token, query)
      .then((data) => {
        const items = Array.isArray((data as any)?.items)
          ? (data as any).items
          : Array.isArray(data)
          ? (data as any)
          : [];
        setInterventions(items);
        setTotal((data as any)?.total ?? items.length);
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les interventions', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInterventions();
  }, [token, filters.startDate, filters.endDate, filters.siteId, filters.clientId, filters.type, filters.subType, filters.agentId, filters.status, page]);

  useEffect(() => {
    if (!token || !viewing) return;
    listAttendance(token, {
      siteId: viewing.siteId,
      startDate: viewing.date,
      endDate: viewing.date,
      status: 'all',
    })
      .then((data) => {
        const items = (data as any)?.items ?? (data as any);
        setViewAttendances(items);
      })
      .catch(() => setViewAttendances([]));

    listAnomalies(token, viewing.id)
      .then(setAnomalies)
      .catch(() => setAnomalies([]));
  }, [token, viewing]);

  const siteOptions = useMemo(() => [{ value: 'all', label: 'Tous les sites' }].concat(sites.map((site) => ({ value: site.id, label: site.name }))), [sites]);
  const clientOptions = useMemo(() => [{ value: 'all', label: 'Tous les clients' }].concat(clients.map((client) => ({ value: client.id, label: client.name }))), [clients]);
  const agentOptions = useMemo(() => [{ value: 'all', label: 'Tous les agents' }].concat(users.map((user) => ({ value: user.id, label: user.name }))), [users]);
  const hasStarted = (intervention: Intervention) => {
    const planned = new Date(`${intervention.date}T${intervention.startTime}:00`);
    return Date.now() >= planned.getTime();
  };

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    if (name === 'agentIds') {
      const selected = Array.from((event.target as HTMLSelectElement).selectedOptions).map((option) => option.value);
      setForm((prev) => ({ ...prev, agentIds: selected }));
    } else if (name === 'truckLabels') {
      setForm((prev) => ({ ...prev, truckLabels: value.split(',').map((item) => item.trim()).filter(Boolean) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const submitAnomaly = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !viewing) return;
    if (!anomalyForm.type.trim() || !anomalyForm.description.trim()) {
      notify('Type et description obligatoires', 'error');
      return;
    }
    setSavingAnomaly(true);
    try {
      const created = await createAnomaly(token, {
        interventionId: viewing.id,
        type: anomalyForm.type.trim(),
        title: anomalyForm.title.trim() || undefined,
        description: anomalyForm.description.trim(),
      });
      setAnomalies((prev) => [created, ...prev]);
      setAnomalyForm({ type: '', title: '', description: '' });
      notify('Anomalie ajoutée', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible d'ajouter l'anomalie", 'error');
    } finally {
      setSavingAnomaly(false);
    }
  };

  const resolveAnomaly = async (id: string) => {
    if (!token) return;
    try {
      const updated = await updateAnomalyStatus(token, id, 'RESOLVED');
      setAnomalies((prev) => prev.map((a) => (a.id === id ? updated : a)));
      notify('Anomalie résolue', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de mettre à jour', 'error');
    }
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!form.siteId || !form.date) {
      notify('Site et date requis', 'error');
      return;
    }
    if (!form.agentIds.length && form.type === 'REGULAR') {
      notify('Sélectionnez au moins un agent', 'error');
      return;
    }
    setCreating(true);
    try {
      if (editingId) {
        const payload = observationOnly ? { observation: form.observation } : form;
        await updateIntervention(token, editingId, payload);
        notify('Intervention mise à jour');
      } else {
        await createIntervention(token, form);
        notify('Intervention créée');
      }
      setForm((prev) => ({ ...prev, label: '', truckLabels: [], agentIds: form.agentIds, observation: '' }));
      setEditingId(null);
      setObservationOnly(false);
      fetchInterventions();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Enregistrement impossible', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (intervention: Intervention) => {
    if (intervention.status === 'CANCELLED') {
      notify("Impossible de modifier une intervention annulée", 'error');
      return;
    }
    const obsOnly = intervention.status === 'COMPLETED' || intervention.status === 'NO_SHOW';
    if (obsOnly) {
      notify('Seule l’observation peut être modifiée sur une intervention terminée ou non effectuée.');
    }
    setObservationOnly(obsOnly);
    setEditingId(intervention.id);
    setForm({
      type: intervention.type,
      siteId: intervention.siteId,
      date: intervention.date,
      startTime: intervention.startTime,
      endTime: intervention.endTime,
      label: intervention.label,
      subType: intervention.subType,
      agentIds: intervention.agentIds,
      truckLabels: intervention.truckLabels,
      observation: intervention.observation,
    });
    setFormVisible(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setObservationOnly(false);
    setForm((prev) => ({ ...createFormDefaults, siteId: prev.siteId, agentIds: prev.agentIds }));
  };

  const duplicate = async (intervention: Intervention) => {
    if (!token) return;
    const date = window.prompt('Nouvelle date (YYYY-MM-DD) ?', intervention.date);
    if (!date) return;
    try {
      await duplicateIntervention(token, intervention.id, date);
      notify('Intervention dupliquée');
      fetchInterventions();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Duplication impossible', 'error');
    }
  };

  const cancel = async (intervention: Intervention) => {
    if (!token) return;
    const observation = window.prompt('Motif annulation ?');
    if (!observation) {
      notify('Motif obligatoire', 'error');
      return;
    }
    try {
      await cancelIntervention(token, intervention.id, observation);
      notify('Intervention annulée');
      fetchInterventions();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Annulation impossible', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="pill">Interventions</span>
        <h2>Vue terrain concrète</h2>
        <p>Planifiez les missions régulières ou ponctuelles et pilotez les équipes affectées.</p>
        <Button type="button" onClick={openCreateForm}>
          Nouvelle intervention
        </Button>
      </div>

      <div className="filter-grid" role="search">
        <label className="filter-field filter-card">
          Du
          <input type="date" value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
        </label>
        <label className="filter-field filter-card">
          Au
          <input type="date" value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
        </label>
        <label className="filter-field filter-card">
          Site
          <select value={filters.siteId} onChange={(event) => setFilters((prev) => ({ ...prev, siteId: event.target.value }))}>
            {siteOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Type
          <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value as InterventionType | 'all' }))}>
            {TYPE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Sous-type
          <input
            type="text"
            value={filters.subType}
            onChange={(event) => setFilters((prev) => ({ ...prev, subType: event.target.value }))}
            placeholder="Ponctuel"
          />
        </label>
        <label className="filter-field filter-card">
          Agent
          <select value={filters.agentId} onChange={(event) => setFilters((prev) => ({ ...prev, agentId: event.target.value }))}>
            {agentOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Statut
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as InterventionStatus | 'all' }))}>
            {STATUS_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
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

      {formVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at 20% 20%, rgba(68,174,248,0.08), transparent 25%), rgba(0,0,0,0.5)',
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
              maxWidth: '960px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              border: '1px solid #eef1f4',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Intervention</span>
                <h3 style={{ margin: 0, letterSpacing: '-0.01em' }}>
                  {editingId ? 'Modifier une intervention' : 'Nouvelle intervention'}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={cancelEditing}>
                  Réinitialiser
                </Button>
                <Button type="button" variant="ghost" onClick={() => { cancelEditing(); setFormVisible(false); }}>
                  Fermer
                </Button>
              </div>
            </div>

            <form
              className="form-card"
              onSubmit={submitForm}
              style={{
                boxShadow: 'none',
                padding: '0.5rem 0.75rem',
                marginTop: '1rem',
                display: 'grid',
                gap: '1rem',
              }}
            >
              <Select
                id="type"
                name="type"
                label="Type"
                options={TYPE_OPTIONS.filter((option) => option.value !== 'all') as { value: string; label: string }[]}
                value={form.type}
                onChange={handleFormChange}
                disabled={observationOnly}
              />
              <Select
                id="site"
                name="siteId"
                label="Site"
                options={sites.map((site) => ({ value: site.id, label: site.name }))}
                value={form.siteId}
                onChange={handleFormChange}
                disabled={observationOnly}
              />
              {form.type === 'PONCTUAL' && (
                <Select
                  id="subType"
                  name="subType"
                  label="Sous-type"
                  options={PONCTUAL_SUBTYPES.map((sub) => ({ value: sub, label: sub }))}
                  value={form.subType ?? PONCTUAL_SUBTYPES[0]}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                />
              )}
              <Input
                id="label"
                name="label"
                label="Libellé"
                value={form.label ?? ''}
                onChange={handleFormChange}
                placeholder="Nettoyage du site – matin"
                disabled={observationOnly}
              />
              <div className="form-row">
                <Input
                  id="date"
                  name="date"
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                />
                <Input
                  id="startTime"
                  name="startTime"
                  label="Début"
                  type="time"
                  value={form.startTime}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                />
                <Input
                  id="endTime"
                  name="endTime"
                  label="Fin"
                  type="time"
                  value={form.endTime}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                />
              </div>
              <label className="form-field">
                <span>Agents</span>
                <select
                  name="agentIds"
                  multiple
                  value={form.agentIds}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                >
                  {users.map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              {form.type === 'PONCTUAL' && (
                <Input
                  id="truckLabels"
                  name="truckLabels"
                  label="Camions"
                  placeholder="Camion 01, Camion 02"
                  value={form.truckLabels?.join(', ') ?? ''}
                  onChange={handleFormChange}
                  disabled={observationOnly}
                />
              )}
              <label className="form-field" htmlFor="observation">
                <span>Observation admin / superviseur</span>
                <textarea
                  id="observation"
                  name="observation"
                  value={form.observation ?? ''}
                  onChange={handleFormChange}
                  placeholder="Instruction ou remarque"
                />
              </label>
              <div className="form-actions" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormVisible(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <h3>Interventions planifiées</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="liste interventions">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heures</th>
                  <th>Site</th>
                  <th>Type</th>
                  <th>Agents</th>
                  <th>Camions</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((intervention) => (
                  <tr key={intervention.id}>
                    <td>{intervention.date}</td>
                    <td>
                      {intervention.startTime} – {intervention.endTime}
                    </td>
                    <td>
                      <strong>{intervention.siteName}</strong>
                      <small style={{ display: 'block', color: 'var(--color-muted)' }}>{intervention.clientName}</small>
                    </td>
                    <td>
                      {intervention.type === 'REGULAR'
                        ? 'Régulier'
                        : `Ponctuel - ${intervention.subType ?? 'Sans sous-type'}`}
                    </td>
                    <td>{intervention.agents.map((agent) => agent.name).join(', ') || '—'}</td>
                    <td>{intervention.truckLabels.join(', ') || '—'}</td>
                    <td>
                      <span className={`status-chip ${intervention.status === 'PLANNED' ? 'status-chip--info' : intervention.status === 'COMPLETED' ? 'status-chip--success' : 'status-chip--warning'}`}>
                        {{
                          PLANNED: 'Planifiée',
                          IN_PROGRESS: 'En cours',
                          COMPLETED: 'Terminée',
                          NEEDS_REVIEW: 'À valider',
                          CANCELLED: 'Annulée',
                          NO_SHOW: 'Non effectuée',
                        }[intervention.status] || intervention.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          onClick={() => {
                            setViewing(intervention);
                            setModalObservation(intervention.observation ?? '');
                          }}
                        >
                          Visualiser
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          onClick={() => startEditing(intervention)}
                          disabled={
                            intervention.status === 'COMPLETED' ||
                            intervention.status === 'CANCELLED' ||
                            intervention.status === 'NO_SHOW' ||
                            hasStarted(intervention)
                          }
                        >
                          Éditer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          onClick={() => duplicate(intervention)}
                          disabled={
                            intervention.status === 'COMPLETED' ||
                            intervention.status === 'CANCELLED' ||
                            intervention.status === 'NO_SHOW'
                          }
                        >
                          Dupliquer
                        </Button>
                        <Button type="button" variant="ghost" className="btn--compact" onClick={() => cancel(intervention)}>
                          Annuler
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
      <div className="pagination" style={{ marginTop: '1rem' }}>
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

      {viewing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '800px',
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Intervention</span>
                <h3 style={{ marginBottom: 0 }}>{viewing.siteName}</h3>
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                  {viewing.date} · {viewing.startTime} - {viewing.endTime}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
                Fermer
              </Button>
            </div>
            <div className="detail-grid" style={{ marginTop: '1rem' }}>
              <div>
                <strong>Site</strong>
                <p>{viewing.siteName}</p>
              </div>
              <div>
                <strong>Type</strong>
                <p>{viewing.type === 'REGULAR' ? 'Régulier' : `Ponctuel - ${viewing.subType ?? 'Sans sous-type'}`}</p>
              </div>
              <div>
                <strong>Agents</strong>
                <p>{viewing.agents.map((a) => a.name).join(', ') || '—'}</p>
              </div>
              <div>
                <strong>Camions</strong>
                <p>{viewing.truckLabels.join(', ') || '—'}</p>
              </div>
              <div>
                <strong>Statut</strong>
                <p>{viewing.status}</p>
              </div>
              <div>
                <strong>Observation</strong>
                <p>{viewing.observation || '—'}</p>
              </div>
            </div>

              <div style={{ marginTop: '1.5rem' }}>
                <h4>Agents & pointages</h4>
                <div className="table-wrapper" style={{ maxHeight: 240, overflow: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Arrivée</th>
                        <th>Début</th>
                        <th>Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceByAgent.length
                        ? attendanceByAgent.map((att) => (
                            <tr key={att.id}>
                              <td>{att.agent.name}</td>
                              <td>{att.checkInTime ?? att.plannedStart ?? '—'}</td>
                              <td>{att.checkInTime ?? '—'}</td>
                              <td>{att.checkOutTime ?? '—'}</td>
                            </tr>
                          ))
                        : null}
                      {viewing.agents
                        .filter((agent) => !attendanceByAgent.some((att) => att.agent.id === agent.id))
                        .map((agent) => (
                          <tr key={agent.id}>
                            <td>{agent.name}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                          </tr>
                        ))}
                      {!viewing.agents.length && viewAttendances.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                            Aucun agent associé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
              {['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(viewing.status) ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <h4>Observation superviseur / admin</h4>
                  <div
                    style={{
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: '12px',
                      background: '#fafbfc',
                      padding: '0.75rem',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <textarea
                      value={modalObservation}
                      onChange={(e) => setModalObservation(e.target.value)}
                      placeholder="Ajouter une observation"
                      rows={4}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        resize: 'vertical',
                        fontSize: '0.95rem',
                        color: 'var(--color-text, #111827)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
                      Fermer
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!token || !viewing) return;
                        setSavingObservation(true);
                        try {
                          await updateIntervention(token, viewing.id, { observation: modalObservation });
                          setViewing({ ...viewing, observation: modalObservation });
                        } finally {
                          setSavingObservation(false);
                        }
                      }}
                      disabled={savingObservation}
                    >
                      {savingObservation ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
                    Fermer
                  </Button>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                <h4>Anomalies</h4>
                {anomalies.length === 0 && <p style={{ color: 'var(--color-muted)' }}>Aucune anomalie.</p>}
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      background: '#fafbfc',
                      display: 'grid',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{anomaly.type}</strong>
                      <span
                        className="pill"
                        style={{
                          background: anomaly.status === 'NEW' ? '#fff4e6' : '#e7f8ef',
                          color: anomaly.status === 'NEW' ? '#b15b00' : '#0b874b',
                        }}
                      >
                        {anomaly.status === 'NEW' ? 'Nouveau' : 'Résolu'}
                      </span>
                    </div>
                    {anomaly.title && <div style={{ fontWeight: 600 }}>{anomaly.title}</div>}
                    <div style={{ color: 'var(--color-muted)' }}>{anomaly.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {anomaly.user?.name ?? '—'} · {new Date(anomaly.createdAt).toLocaleString('fr-FR')}
                    </div>
                    {anomaly.photos?.length ? (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {anomaly.photos.map((uri) => (
                          <img
                            key={uri}
                            src={uri}
                            alt={anomaly.title ?? anomaly.type}
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                          />
                        ))}
                      </div>
                    ) : null}
                    {anomaly.status === 'NEW' && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="ghost" onClick={() => resolveAnomaly(anomaly.id)}>
                          Marquer résolu
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <form onSubmit={submitAnomaly} style={{ display: 'grid', gap: '0.5rem' }}>
                  <h5 style={{ margin: 0 }}>Ajouter une anomalie</h5>
                  <Input
                    name="type"
                    label="Type"
                    value={anomalyForm.type}
                    onChange={(e) => setAnomalyForm((prev) => ({ ...prev, type: e.target.value }))}
                    required
                  />
                  <Input
                    name="title"
                    label="Titre (optionnel)"
                    value={anomalyForm.title}
                    onChange={(e) => setAnomalyForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <label style={{ display: 'grid', gap: '0.25rem' }}>
                    <span>Description</span>
                    <textarea
                      name="description"
                      value={anomalyForm.description}
                      onChange={(e) => setAnomalyForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        padding: '0.5rem',
                      }}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Button type="submit" disabled={savingAnomaly}>
                      {savingAnomaly ? 'Ajout...' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
