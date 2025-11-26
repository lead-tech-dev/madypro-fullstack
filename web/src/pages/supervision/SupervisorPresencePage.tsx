import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listAttendance } from '../../services/api/attendance.api';
import { listSites } from '../../services/api/sites.api';
import { listInterventions } from '../../services/api/interventions.api';
import { Attendance } from '../../types/attendance';
import { Site } from '../../types/site';
import { Intervention } from '../../types/intervention';
import { Input } from '../../components/ui/Input';
import { formatDateTime } from '../../utils/datetime';

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const today = todayLocal();

export const SupervisorPresencePage: React.FC = () => {
  const { token, user, notify } = useAuthContext();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [filters, setFilters] = useState<{ siteId: string; date: string; search: string }>({
    siteId: 'all',
    date: today,
    search: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      if (!token) return;
      setLoading(true);
      Promise.all([
        listAttendance(token, { startDate: filters.date, endDate: filters.date, pageSize: 200 }).catch(() => [] as Attendance[]),
        listSites(token, { pageSize: 200 }).catch(() => ({ items: [] as Site[] })),
        listInterventions(token, { startDate: filters.date, endDate: filters.date, pageSize: 500 }).catch(() => ({ items: [] as Intervention[] })),
      ])
        .then(([attendanceRes, sitesRes, interventionsRes]) => {
          const items = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes as any).items ?? [];
          const interventionsList = (interventionsRes as any).items ?? (Array.isArray(interventionsRes) ? interventionsRes : []);
          setInterventions(interventionsList);
          setAttendance(items.map((att) => mergePlannedFromIntervention(att, interventionsList)));
          setSites((sitesRes as any).items ?? (sitesRes as Site[]));
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Impossible de charger la présence';
          notify(message, 'error');
        })
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [token, filters.date, notify]);

  const supervisedSiteIds = useMemo(() => {
    if (!user || user.role?.toUpperCase() !== 'SUPERVISOR') return null;
    const ids = sites.filter((s) => s.supervisorIds?.includes(user.id)).map((s) => s.id);
    return ids.length ? new Set(ids) : null;
  }, [sites, user]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((att) => {
      if (supervisedSiteIds && !supervisedSiteIds.has(att.site.id)) return false;
      if (filters.siteId !== 'all' && att.site.id !== filters.siteId) return false;
      if (filters.search) {
        const target = `${att.agent.name} ${att.site.name}`.toLowerCase();
        if (!target.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
  }, [attendance, filters.search, filters.siteId, supervisedSiteIds]);

  const mergePlannedFromIntervention = (att: Attendance, ints: Intervention[]) => {
    const match = ints.find(
      (intervention) =>
        intervention.siteId === att.site.id &&
        intervention.date === filters.date &&
        intervention.agents?.some((a) => a.id === att.agent.id),
    );
    if (!match) return att;
    return {
      ...att,
      plannedStart: att.plannedStart ?? match.startTime,
      plannedEnd: att.plannedEnd ?? match.endTime,
    };
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Supervision</span>
        <h2>Présence temps réel</h2>
        <p>Suivi des agents par site : présent, absent, en retard, avec actions de justification/correction.</p>
      </div>

      <div className="filter-grid" style={{ marginBottom: '1rem' }}>
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
        <Input
          type="date"
          label="Date"
          value={filters.date}
          onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
        />
        <Input
          label="Recherche (agent/site)"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Nom de l’agent ou du site"
        />
      </div>

      <div className="panel">
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="présence en temps réel">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Site</th>
                  <th>Check-in</th>
                  <th>Prévu</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((att) => {
                  const isPresent = Boolean(att.checkInTime);
                  const isLate =
                    isPresent && att.plannedStart && att.checkInTime && att.checkInTime > att.plannedStart;
                  return (
                    <tr key={att.id}>
                      <td>{att.agent.name}</td>
                      <td>{att.site.name}</td>
                      <td>{att.checkInTime ? formatDateTime(att.checkInTime) : '—'}</td>
                      <td>
                        {att.plannedStart || att.plannedEnd
                          ? `${att.plannedStart ?? '—'}${att.plannedEnd ? ` → ${att.plannedEnd}` : ''}`
                          : '—'}
                      </td>
                      <td>
                        <span
                          className={`status-chip ${
                            isPresent ? (isLate ? 'status-chip--warning' : 'status-chip--success') : 'status-chip--info'
                          }`}
                        >
                          {isPresent ? (isLate ? 'En retard' : 'Présent') : 'Absent / non pointé'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredAttendance.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                      Aucune présence pour les filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
