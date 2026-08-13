import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listRules, createRule, updateRule, toggleRule, CreateRulePayload } from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { listUsers } from '../../services/api/users.api';
import { InterventionRule } from '../../types/intervention';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

type FormState = {
  siteId: string;
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  intervalWeeks: string;
  startDate: string;
  endDate: string;
  agentIds: string[];
};

const INITIAL_FORM: FormState = {
  siteId: '',
  label: '',
  startTime: '08:00',
  endTime: '10:00',
  daysOfWeek: [],
  intervalWeeks: '1',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  agentIds: [],
};

const INTERVAL_LABELS: Record<number, string> = {
  1: 'Chaque semaine',
  2: 'Une semaine sur deux',
  3: 'Toutes les 3 semaines',
  4: 'Toutes les 4 semaines',
};

export const RulesPage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const { token, notify } = useAuthContext();
  const [rules, setRules] = useState<InterventionRule[]>([]);
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});
  const [siteOptions, setSiteOptions] = useState<{ value: string; label: string }[]>([]);
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listRules(token)
      .then(setRules)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les règles', 'error'))
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

  const openEditForm = (rule: InterventionRule) => {
    setEditingId(rule.id);
    setForm({
      siteId: rule.siteId,
      label: rule.label,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      intervalWeeks: String(rule.intervalWeeks ?? 1),
      startDate: rule.startDate.slice(0, 10),
      endDate: rule.endDate ? rule.endDate.slice(0, 10) : '',
      agentIds: rule.agentIds,
    });
    setFormOpen(true);
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const toggleAgent = (id: string) => {
    setForm((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(id) ? prev.agentIds.filter((a) => a !== id) : [...prev.agentIds, id],
    }));
  };

  const isInvalid =
    !token || !form.siteId || !form.label.trim() || !form.startTime || !form.endTime || form.daysOfWeek.length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isInvalid) return;
    setSubmitting(true);
    try {
      const payload: CreateRulePayload = {
        siteId: form.siteId,
        agentIds: form.agentIds,
        label: form.label.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        daysOfWeek: form.daysOfWeek,
        intervalWeeks: Number(form.intervalWeeks) || 1,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      };
      if (editingId) {
        await updateRule(token, editingId, payload);
        notify('Règle mise à jour');
      } else {
        await createRule(token, payload);
        notify('Règle créée — la prochaine génération proposera les occurrences à valider');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible d'enregistrer cette règle", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: InterventionRule) => {
    if (!token) return;
    try {
      await toggleRule(token, rule.id, !rule.active);
      notify(rule.active ? 'Règle désactivée' : 'Règle activée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de modifier le statut', 'error');
    }
  };

  return (
    <div className={embedded ? undefined : 'page'}>
      {embedded ? (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginTop: 0 }}>
            Définissez les interventions qui se répètent (chaque jour, chaque semaine, une semaine sur deux, etc.).
            Les occurrences générées passent par une validation admin avant création.
          </p>
          <Button type="button" onClick={openCreateForm}>
            Nouvelle règle
          </Button>
        </div>
      ) : (
        <div className="page-header">
          <span className="pill">Interventions</span>
          <h2>Règles récurrentes</h2>
          <p>
            Définissez les interventions qui se répètent (chaque jour, chaque semaine, une semaine sur deux, etc.).
            Les occurrences générées passent par une validation admin avant création.
          </p>
          <Button type="button" onClick={openCreateForm}>
            Nouvelle règle
          </Button>
        </div>
      )}

      <div className="panel">
        <div className="table-wrapper">
          <table className="table" aria-label="règles récurrentes">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Site</th>
                <th>Jours</th>
                <th>Fréquence</th>
                <th>Horaire</th>
                <th>Agents</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.label}</td>
                  <td>{siteNames[rule.siteId] ?? rule.siteId}</td>
                  <td>
                    {rule.daysOfWeek
                      .slice()
                      .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                      .map((d) => DAYS.find((day) => day.value === d)?.label ?? d)
                      .join(', ')}
                  </td>
                  <td>{INTERVAL_LABELS[rule.intervalWeeks] ?? `Toutes les ${rule.intervalWeeks} semaines`}</td>
                  <td>
                    {rule.startTime}–{rule.endTime}
                  </td>
                  <td>{rule.agentIds.length} agent(s)</td>
                  <td>
                    {new Date(rule.startDate).toLocaleDateString('fr-FR')}
                    {rule.endDate ? ` → ${new Date(rule.endDate).toLocaleDateString('fr-FR')}` : ' → indéfini'}
                  </td>
                  <td>
                    <span className={`status-chip ${rule.active ? 'status-chip--success' : 'status-chip--warning'}`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Button type="button" variant="ghost" className="btn--compact" onClick={() => openEditForm(rule)}>
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" className="btn--compact" onClick={() => handleToggleActive(rule)}>
                        {rule.active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rules.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    Aucune règle récurrente définie.
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
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              border: '1px solid #eef1f4',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Règle</span>
                <h3 style={{ margin: 0, letterSpacing: '-0.01em' }}>
                  {editingId ? 'Modifier la règle' : 'Nouvelle règle récurrente'}
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
                placeholder="Nettoyage atelier – matin"
                required
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
              <Select
                id="siteId"
                name="siteId"
                label="Site"
                options={[{ value: '', label: 'Sélectionner un site' }, ...siteOptions]}
                value={form.siteId}
                onChange={(e) => setForm((prev) => ({ ...prev, siteId: e.target.value }))}
              />

              <div className="form-field">
                <span>Jours de la semaine</span>
                <div className="chips">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`chip ${form.daysOfWeek.includes(day.value) ? 'chip--selected' : ''}`}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <Input
                  id="startTime"
                  name="startTime"
                  label="Heure de début"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
                <Input
                  id="endTime"
                  name="endTime"
                  label="Heure de fin"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>

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
                <span>Agents assignés</span>
                <div className="chips">
                  {agentOptions.length ? (
                    agentOptions.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        className={`chip ${form.agentIds.includes(agent.id) ? 'chip--selected' : ''}`}
                        onClick={() => toggleAgent(agent.id)}
                      >
                        {agent.name}
                      </button>
                    ))
                  ) : (
                    <span className="tag tag--muted">Aucun agent disponible</span>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit" disabled={isInvalid || submitting}>
                  {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer la règle'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
