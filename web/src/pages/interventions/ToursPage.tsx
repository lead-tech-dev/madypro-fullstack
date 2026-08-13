import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import {
  listTours,
  createTour,
  updateTour,
  toggleTour,
  previewTour,
  generateTour,
  getRouteOptimization,
  CreateTourPayload,
  TourStopPayload,
} from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { listUsers } from '../../services/api/users.api';
import { TourRule, TourPreview, RouteOptimizationResult } from '../../types/intervention';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];
const DAY_LABEL: Record<number, string> = Object.fromEntries(DAYS.map((d) => [d.value, d.label]));

type StopRow = {
  dayOfWeek: number;
  siteId: string;
  startTime: string;
  endTime: string;
  agentIds: string[];
};

const EMPTY_STOP: StopRow = { dayOfWeek: 1, siteId: '', startTime: '08:00', endTime: '10:00', agentIds: [] };

type FormState = {
  label: string;
  intervalWeeks: string;
  startDate: string;
  endDate: string;
  stops: StopRow[];
};

const INITIAL_FORM: FormState = {
  label: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  intervalWeeks: '1',
  stops: [{ ...EMPTY_STOP }],
};

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (dateStr: string, days: number) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
};

/** Grille calendrier (semaines complètes Lun→Dim) couvrant [start, end]. */
const buildCalendarDays = (start: string, end: string): string[] => {
  const startD = new Date(`${start}T00:00:00Z`);
  const endD = new Date(`${end}T00:00:00Z`);
  const gridStart = new Date(startD);
  gridStart.setUTCDate(gridStart.getUTCDate() - ((startD.getUTCDay() + 6) % 7));
  const gridEnd = new Date(endD);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - ((endD.getUTCDay() + 6) % 7)));
  const days: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(toIso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const SITE_COLORS = ['#0E8E7C', '#B15B00', '#3B5BDB', '#C2255C', '#5C940D', '#862E9C'];

export const ToursPage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const { token, notify } = useAuthContext();
  const [tours, setTours] = useState<TourRule[]>([]);
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});
  const [siteOptions, setSiteOptions] = useState<{ value: string; label: string }[]>([]);
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [routeAgentId, setRouteAgentId] = useState('');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [route, setRoute] = useState<RouteOptimizationResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const fetchRoute = async () => {
    if (!token || !routeAgentId || !routeDate) return;
    setRouteLoading(true);
    try {
      const result = await getRouteOptimization(token, routeAgentId, routeDate);
      setRoute(result);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Optimisation impossible', 'error');
    } finally {
      setRouteLoading(false);
    }
  };

  const [generateTourId, setGenerateTourId] = useState<string | null>(null);
  const [generatePeriod, setGeneratePeriod] = useState<'day' | 'week' | 'custom'>('week');
  const [genStartDate, setGenStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [genEndDate, setGenEndDate] = useState(addDays(new Date().toISOString().slice(0, 10), 6));
  const [preview, setPreview] = useState<TourPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listTours(token)
      .then(setTours)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les tournées', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  useEffect(() => {
    if (!token) return;
    listSites(token, { pageSize: 500 })
      .then((res) => {
        const map: Record<string, string> = {};
        res.items.forEach((s) => {
          map[s.id] = s.name;
        });
        setSiteNames(map);
        setSiteOptions(res.items.map((s) => ({ value: s.id, label: s.name })));
      })
      .catch(() => {
        setSiteNames({});
        setSiteOptions([]);
      });
    listUsers(token, { role: 'AGENT', pageSize: 500 })
      .then((res) => setAgentOptions(res.items.map((u: any) => ({ id: u.id, name: u.name }))))
      .catch(() => setAgentOptions([]));
  }, [token]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormOpen(true);
  };

  const openEditForm = (tour: TourRule) => {
    setEditingId(tour.id);
    setForm({
      label: tour.label,
      intervalWeeks: String(tour.intervalWeeks ?? 1),
      startDate: tour.startDate.slice(0, 10),
      endDate: tour.endDate ? tour.endDate.slice(0, 10) : '',
      stops: tour.stops.length
        ? tour.stops.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            siteId: s.siteId,
            startTime: s.startTime,
            endTime: s.endTime,
            agentIds: s.agentIds,
          }))
        : [{ ...EMPTY_STOP }],
    });
    setFormOpen(true);
  };

  const updateStop = (index: number, patch: Partial<StopRow>) => {
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)),
    }));
  };

  const toggleStopAgent = (index: number, agentId: string) => {
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, i) =>
        i === index
          ? {
              ...stop,
              agentIds: stop.agentIds.includes(agentId)
                ? stop.agentIds.filter((a) => a !== agentId)
                : [...stop.agentIds, agentId],
            }
          : stop,
      ),
    }));
  };

  const addStop = () => {
    setForm((prev) => ({ ...prev, stops: [...prev.stops, { ...EMPTY_STOP }] }));
  };

  const removeStop = (index: number) => {
    setForm((prev) => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  };

  const isInvalid =
    !token ||
    !form.label.trim() ||
    !form.stops.length ||
    form.stops.some((s) => !s.siteId || !s.startTime || !s.endTime);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isInvalid) return;
    setSubmitting(true);
    try {
      const payload: CreateTourPayload = {
        label: form.label.trim(),
        intervalWeeks: Number(form.intervalWeeks) || 1,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        stops: form.stops.map(
          (s, index): TourStopPayload => ({
            dayOfWeek: s.dayOfWeek,
            siteId: s.siteId,
            startTime: s.startTime,
            endTime: s.endTime,
            agentIds: s.agentIds,
            order: index,
          }),
        ),
      };
      if (editingId) {
        await updateTour(token, editingId, payload);
        notify('Tournée mise à jour');
      } else {
        await createTour(token, payload);
        notify('Tournée créée — utilisez « Générer » pour planifier les interventions');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible d'enregistrer cette tournée", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (tour: TourRule) => {
    if (!token) return;
    try {
      await toggleTour(token, tour.id, !tour.active);
      notify(tour.active ? 'Tournée désactivée' : 'Tournée activée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de modifier le statut', 'error');
    }
  };

  const openGenerate = (tour: TourRule) => {
    const today = new Date().toISOString().slice(0, 10);
    setGenerateTourId(tour.id);
    setGeneratePeriod('week');
    setGenStartDate(today);
    setGenEndDate(addDays(today, 6));
    setPreview(null);
  };

  const applyPeriodPreset = (period: 'day' | 'week' | 'custom') => {
    setGeneratePeriod(period);
    setPreview(null);
    const today = new Date().toISOString().slice(0, 10);
    if (period === 'day') {
      setGenStartDate(today);
      setGenEndDate(today);
    } else if (period === 'week') {
      setGenStartDate(today);
      setGenEndDate(addDays(today, 6));
    }
  };

  const handlePreview = async () => {
    if (!token || !generateTourId) return;
    setPreviewLoading(true);
    try {
      const result = await previewTour(token, generateTourId, genStartDate, genEndDate);
      setPreview(result);
      if (!result.occurrences.length) {
        notify('Aucune occurrence sur cette période.', 'error');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible de calculer l'aperçu", 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!token || !generateTourId || !preview?.occurrences.length) return;
    setGenerating(true);
    try {
      const result = await generateTour(token, generateTourId, genStartDate, genEndDate);
      if (Array.isArray(result)) {
        notify(`${result.length} intervention(s) créée(s) — notification unique envoyée à chaque agent concerné`);
      } else {
        notify('Demande envoyée pour validation par un admin');
      }
      setGenerateTourId(null);
      setPreview(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de générer la tournée', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generatingTour = tours.find((t) => t.id === generateTourId);

  return (
    <div className={embedded ? undefined : 'page'}>
      {embedded ? (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginTop: 0 }}>
            Un agent qui visite plusieurs sites différents selon le jour de la semaine. Générez toutes les
            interventions d'une période (jour, semaine, ou jusqu'à un mois) en une seule fois — une seule
            notification est envoyée à chaque agent, pas une par intervention.
          </p>
          <Button type="button" onClick={openCreateForm}>
            Nouvelle tournée
          </Button>
        </div>
      ) : (
        <div className="page-header">
          <span className="pill">Interventions</span>
          <h2>Tournées</h2>
          <p>
            Un agent qui visite plusieurs sites différents selon le jour de la semaine. Générez toutes les
            interventions d'une période (jour, semaine, ou jusqu'à un mois) en une seule fois — une seule
            notification est envoyée à chaque agent, pas une par intervention.
          </p>
          <Button type="button" onClick={openCreateForm}>
            Nouvelle tournée
          </Button>
        </div>
      )}

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Optimisation de tournée du jour</h3>
        <div className="filter-grid">
          <label className="filter-field filter-card">
            Agent
            <select value={routeAgentId} onChange={(e) => setRouteAgentId(e.target.value)}>
              <option value="">Sélectionner</option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field filter-card">
            Date
            <input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
          </label>
          <div className="filter-card" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="button" onClick={fetchRoute} disabled={!routeAgentId || routeLoading}>
              {routeLoading ? 'Calcul...' : 'Optimiser'}
            </Button>
          </div>
        </div>
        {route && (
          <div style={{ marginTop: '0.75rem' }}>
            <p className="card__meta">
              Distance totale estimée : {(route.totalDistanceMeters / 1000).toFixed(1)} km
            </p>
            {route.stops.length === 0 ? (
              <p>Aucune intervention géolocalisée ce jour-là.</p>
            ) : (
              <ol className="list-line">
                {route.stops.map((stop) => (
                  <li key={stop.interventionId}>
                    <span>{stop.startTime}</span>
                    <span>{stop.siteName}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table className="table" aria-label="tournées">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Arrêts</th>
                <th>Fréquence</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => (
                <tr key={tour.id}>
                  <td>{tour.label}</td>
                  <td>
                    {tour.stops.length} arrêt(s) —{' '}
                    {Array.from(new Set(tour.stops.map((s) => siteNames[s.siteId] ?? s.siteId))).join(', ')}
                  </td>
                  <td>{tour.intervalWeeks === 1 ? 'Chaque semaine' : `Toutes les ${tour.intervalWeeks} semaines`}</td>
                  <td>
                    {new Date(tour.startDate).toLocaleDateString('fr-FR')}
                    {tour.endDate ? ` → ${new Date(tour.endDate).toLocaleDateString('fr-FR')}` : ' → indéfini'}
                  </td>
                  <td>
                    <span className={`status-chip ${tour.active ? 'status-chip--success' : 'status-chip--warning'}`}>
                      {tour.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Button type="button" className="btn--compact" onClick={() => openGenerate(tour)}>
                        Générer
                      </Button>
                      <Button type="button" variant="ghost" className="btn--compact" onClick={() => openEditForm(tour)}>
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" className="btn--compact" onClick={() => handleToggleActive(tour)}>
                        {tour.active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && tours.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    Aucune tournée définie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
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
                <span className="pill">Tournée</span>
                <h3 style={{ margin: 0, letterSpacing: '-0.01em' }}>
                  {editingId ? 'Modifier la tournée' : 'Nouvelle tournée'}
                </h3>
              </div>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Fermer
              </Button>
            </div>

            <form
              className="form-card"
              onSubmit={handleSubmit}
              style={{ boxShadow: 'none', padding: '0.75rem', marginTop: '1rem', display: 'grid', gap: '1rem' }}
            >
              <Input
                id="label"
                name="label"
                label="Libellé"
                placeholder="Tournée vitres — équipe A"
                required
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />

              <Input
                id="intervalWeeks"
                name="intervalWeeks"
                label="Fréquence (toutes les N semaines)"
                type="number"
                min={1}
                helperText="1 = chaque semaine, 2 = une semaine sur deux, etc."
                value={form.intervalWeeks}
                onChange={(e) => setForm((prev) => ({ ...prev, intervalWeeks: e.target.value }))}
              />

              <div className="form-row">
                <Input
                  id="startDate"
                  name="startDate"
                  label="Date de début"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  id="endDate"
                  name="endDate"
                  label="Date de fin (facultatif)"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <span>Arrêts (un agent peut avoir plusieurs arrêts le même jour)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {form.stops.map((stop, index) => (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #eef1f4',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        display: 'grid',
                        gap: '0.5rem',
                      }}
                    >
                      <div className="form-row">
                        <Select
                          label="Jour"
                          options={DAYS.map((d) => ({ value: String(d.value), label: d.label }))}
                          value={String(stop.dayOfWeek)}
                          onChange={(e) => updateStop(index, { dayOfWeek: Number(e.target.value) })}
                        />
                        <Select
                          label="Site"
                          options={[{ value: '', label: 'Sélectionner un site' }, ...siteOptions]}
                          value={stop.siteId}
                          onChange={(e) => updateStop(index, { siteId: e.target.value })}
                        />
                        <Input
                          label="Début"
                          type="time"
                          value={stop.startTime}
                          onChange={(e) => updateStop(index, { startTime: e.target.value })}
                        />
                        <Input
                          label="Fin"
                          type="time"
                          value={stop.endTime}
                          onChange={(e) => updateStop(index, { endTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Agents</span>
                        <div className="chips">
                          {agentOptions.length ? (
                            agentOptions.map((agent) => (
                              <button
                                key={agent.id}
                                type="button"
                                className={`chip ${stop.agentIds.includes(agent.id) ? 'chip--selected' : ''}`}
                                onClick={() => toggleStopAgent(index, agent.id)}
                              >
                                {agent.name}
                              </button>
                            ))
                          ) : (
                            <span className="tag tag--muted">Aucun agent disponible</span>
                          )}
                        </div>
                      </div>
                      {form.stops.length > 1 && (
                        <Button type="button" variant="ghost" className="btn--compact" onClick={() => removeStop(index)}>
                          Retirer cet arrêt
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" onClick={addStop}>
                    + Ajouter un arrêt
                  </Button>
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit" disabled={isInvalid || submitting}>
                  {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer la tournée'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generateTourId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
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
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              border: '1px solid #eef1f4',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Génération</span>
                <h3 style={{ margin: 0, letterSpacing: '-0.01em' }}>{generatingTour?.label}</h3>
              </div>
              <Button type="button" variant="ghost" onClick={() => setGenerateTourId(null)}>
                Fermer
              </Button>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${generatePeriod === 'day' ? 'chip--selected' : ''}`}
                  onClick={() => applyPeriodPreset('day')}
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  className={`chip ${generatePeriod === 'week' ? 'chip--selected' : ''}`}
                  onClick={() => applyPeriodPreset('week')}
                >
                  Cette semaine
                </button>
                <button
                  type="button"
                  className={`chip ${generatePeriod === 'custom' ? 'chip--selected' : ''}`}
                  onClick={() => applyPeriodPreset('custom')}
                >
                  Période personnalisée (jusqu'à 1 mois)
                </button>
              </div>

              <div className="form-row">
                <Input
                  label="Du"
                  type="date"
                  value={genStartDate}
                  onChange={(e) => {
                    setGenStartDate(e.target.value);
                    setPreview(null);
                  }}
                  disabled={generatePeriod !== 'custom'}
                />
                <Input
                  label="Au"
                  type="date"
                  value={genEndDate}
                  onChange={(e) => {
                    setGenEndDate(e.target.value);
                    setPreview(null);
                  }}
                  disabled={generatePeriod !== 'custom'}
                />
              </div>

              <Button type="button" variant="ghost" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Calcul...' : 'Voir l’aperçu'}
              </Button>

              {preview && (
                <div className="panel" style={{ padding: '0.75rem' }}>
                  <p className="card__meta">{preview.occurrences.length} intervention(s) seront créées :</p>
                  {(() => {
                    const occurrencesByDate = new Map<string, typeof preview.occurrences>();
                    preview.occurrences.forEach((occ) => {
                      const list = occurrencesByDate.get(occ.date) ?? [];
                      list.push(occ);
                      occurrencesByDate.set(occ.date, list);
                    });
                    const siteColor = new Map<string, string>();
                    Array.from(new Set(preview.occurrences.map((o) => o.siteId))).forEach((siteId, index) => {
                      siteColor.set(siteId, SITE_COLORS[index % SITE_COLORS.length]);
                    });
                    const days = buildCalendarDays(genStartDate, genEndDate);

                    return (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                          {DAYS.map((d) => (
                            <div
                              key={d.value}
                              style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'center', color: 'var(--color-muted)' }}
                            >
                              {d.label.slice(0, 3)}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                          {days.map((day) => {
                            const inRange = day >= genStartDate && day <= genEndDate;
                            const dayOccurrences = occurrencesByDate.get(day) ?? [];
                            return (
                              <div
                                key={day}
                                style={{
                                  minHeight: '64px',
                                  border: '1px solid #eef1f4',
                                  borderRadius: '6px',
                                  padding: '0.25rem',
                                  background: inRange ? '#fff' : '#fafafa',
                                  opacity: inRange ? 1 : 0.45,
                                }}
                              >
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{Number(day.slice(8, 10))}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                  {dayOccurrences.map((occ, index) => (
                                    <div
                                      key={index}
                                      title={`${occ.siteName} — ${occ.startTime}–${occ.endTime}`}
                                      style={{
                                        fontSize: '0.65rem',
                                        color: '#fff',
                                        background: siteColor.get(occ.siteId) ?? '#0E8E7C',
                                        borderRadius: '4px',
                                        padding: '1px 4px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {occ.startTime} {occ.siteName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="form-actions">
                <Button type="button" onClick={handleGenerate} disabled={!preview?.occurrences.length || generating}>
                  {generating ? 'Génération...' : 'Confirmer la génération'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setGenerateTourId(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
