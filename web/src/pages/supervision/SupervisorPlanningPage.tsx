import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listInterventions, updateIntervention } from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { Intervention } from '../../types/intervention';
import { Site } from '../../types/site';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const today = new Date();

const startOfWeek = (date: Date) => {
  const day = date.getDay(); // 0=dimanche
  const diff = (day === 0 ? -6 : 1 - day); // ramène au lundi
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const shiftTime = (time: string, deltaMinutes: number) => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10) || 0);
  let total = h * 60 + m + deltaMinutes;
  if (total < 0) total = 0;
  const nh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const nm = Math.floor(total % 60)
    .toString()
    .padStart(2, '0');
  return `${nh}:${nm}`;
};

export const SupervisorPlanningPage: React.FC = () => {
  const { token, user, notify } = useAuthContext();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorDate, setAnchorDate] = useState<Date>(startOfWeek(today));
  const [filters, setFilters] = useState<{ siteId: string; agentId: string }>({ siteId: 'all', agentId: 'all' });

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      listInterventions(token, {
        startDate: toISODate(weekStart),
        endDate: toISODate(weekEnd),
        pageSize: 500,
      }).catch(() => ({ items: [] as Intervention[] })),
      listSites(token, { pageSize: 200 }).catch(() => ({ items: [] as Site[] })),
    ])
      .then(([intRes, sitesRes]) => {
        setInterventions((intRes as any).items ?? (intRes as Intervention[]));
        setSites((sitesRes as any).items ?? (sitesRes as Site[]));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger le planning';
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [token, notify, weekStart, weekEnd]);

  const supervisedSiteIds = useMemo(() => {
    if (!user || user.role?.toUpperCase() !== 'SUPERVISOR') return null;
    return new Set(sites.filter((s) => s.supervisorIds?.includes(user.id)).map((s) => s.id));
  }, [sites, user]);

  const filtered = useMemo(() => {
    return interventions.filter((i) => {
      if (supervisedSiteIds && !supervisedSiteIds.has(i.siteId)) return false;
      if (filters.siteId !== 'all' && i.siteId !== filters.siteId) return false;
      if (filters.agentId !== 'all' && !i.agents.some((a) => a.id === filters.agentId)) return false;
      return true;
    });
  }, [filters.agentId, filters.siteId, interventions, supervisedSiteIds]);

  const groupedBySite = useMemo(() => {
    const map = new Map<string, { site: Site | null; items: Intervention[] }>();
    filtered.forEach((intervention) => {
      const existing = map.get(intervention.siteId);
      const site = sites.find((s) => s.id === intervention.siteId) ?? null;
      if (existing) {
        existing.items.push(intervention);
      } else {
        map.set(intervention.siteId, { site, items: [intervention] });
      }
    });
    return Array.from(map.values()).map((entry) => ({
      ...entry,
      items: entry.items.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    }));
  }, [filtered, sites]);

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    interventions.forEach((i) =>
      i.agents.forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a.name);
      }),
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [interventions]);

  const shiftIntervention = async (intervention: Intervention, deltaStart: number, deltaEnd?: number) => {
    if (!token) return;
    const nextStart = shiftTime(intervention.startTime, deltaStart);
    const nextEnd = shiftTime(intervention.endTime, deltaEnd ?? 0);
    try {
      const updated = await updateIntervention(token, intervention.id, {
        startTime: nextStart,
        endTime: nextEnd,
      });
      setInterventions((prev) => prev.map((i) => (i.id === intervention.id ? { ...i, ...updated } : i)));
      notify('Horaires ajustés');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ajustement impossible';
      notify(message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Supervision</span>
        <h2>Planning des équipes</h2>
        <p>Vue hebdomadaire des équipes par site, avec ajustement horaires et remplacements.</p>
      </div>

      <div className="filter-grid" style={{ marginBottom: '1rem' }}>
        <div className="filter-card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAnchorDate((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
          >
            Semaine précédente
          </Button>
          <div>
            <p className="card__meta" style={{ margin: 0 }}>
              Semaine du
            </p>
            <strong>
              {toISODate(weekStart)} → {toISODate(weekEnd)}
            </strong>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAnchorDate((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
          >
            Semaine suivante
          </Button>
        </div>
        <label className="filter-field filter-card">
          Site
          <select
            value={filters.siteId}
            onChange={(e) => setFilters((prev) => ({ ...prev, siteId: e.target.value }))}
          >
            <option value="all">Tous</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field filter-card">
          Agent
          <select
            value={filters.agentId}
            onChange={(e) => setFilters((prev) => ({ ...prev, agentId: e.target.value }))}
          >
            <option value="all">Tous</option>
            {agentOptions.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="panel">
          <p>Chargement...</p>
        </div>
      ) : (
        groupedBySite.map(({ site, items }) => (
          <div key={site?.id ?? 'unknown'} className="panel" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="card__meta">Site</p>
                <h3 style={{ margin: 0 }}>{site?.name ?? 'Site inconnu'}</h3>
              </div>
            </div>
            <div className="table-wrapper" style={{ marginTop: '0.5rem' }}>
              <table className="table" aria-label={`planning ${site?.name}`}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heures</th>
                    <th>Agents</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((intervention) => (
                    <tr key={intervention.id}>
                      <td>{intervention.date}</td>
                      <td>
                        {intervention.startTime} – {intervention.endTime}
                      </td>
                      <td>{intervention.agents.map((a) => a.name).join(', ') || '—'}</td>
                      <td>
                        <span
                          className={`status-chip ${
                            intervention.status === 'COMPLETED'
                              ? 'status-chip--success'
                              : intervention.status === 'IN_PROGRESS'
                              ? 'status-chip--warning'
                              : 'status-chip--info'
                          }`}
                        >
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
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn--compact"
                            onClick={() => shiftIntervention(intervention, -15, -15)}
                          >
                            -15 min
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn--compact"
                            onClick={() => shiftIntervention(intervention, 15, 15)}
                          >
                            +15 min
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn--compact"
                            onClick={() => shiftIntervention(intervention, -15, 0)}
                          >
                            Avancer début
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="btn--compact"
                            onClick={() => shiftIntervention(intervention, 0, 15)}
                          >
                            Prolonger fin
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                        Aucune intervention sur cette semaine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
