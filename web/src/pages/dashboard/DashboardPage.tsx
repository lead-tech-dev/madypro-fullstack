import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { getDashboardSummary } from '../../services/api/reports.api';
import { DashboardSummary } from '../../types/dashboard';
import { env } from '../../config/env';

type FilterState = {
  date: string;
  site: string;
  supervisor: string;
  search: string;
};

const createDefaultFilters = (defaultDate: string): FilterState => ({
  date: defaultDate,
  site: 'all',
  supervisor: 'all',
  search: '',
});

export const DashboardPage: React.FC = () => {
  const { token } = useAuthContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getDashboardSummary(token)
      .then((data) => {
        setSummary(data);
        setFilters((prev) => prev ?? createDefaultFilters(data.defaultDate));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le tableau de bord");
      })
      .finally(() => setLoading(false));
  }, [token, refreshTick]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(`${env.apiUrl}/realtime/stream?token=${token}`);
    const handler = () => setRefreshTick((prev) => prev + 1);
    source.addEventListener('attendance.arrival', handler);
    source.addEventListener('attendance.checkin', handler);
    source.addEventListener('attendance.checkout', handler);
    source.addEventListener('intervention.status', handler);
    source.addEventListener('intervention.created', handler);
    source.addEventListener('intervention.updated', handler);
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [token]);

  const filteredRecords = useMemo(() => {
    if (!summary || !filters) return [];
    return summary.planning.filter((record) => {
      if (filters.site !== 'all' && record.site !== filters.site) return false;
      if (filters.supervisor !== 'all' && record.supervisor !== filters.supervisor) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const target = `${record.agent} ${record.site} ${record.supervisor}`.toLowerCase();
        if (!target.includes(term)) return false;
      }
      return true;
    });
  }, [summary, filters]);

  const metrics = useMemo(() => {
    if (!summary || !filters) return [];
    const planned = filteredRecords.filter((record) => record.planned).length;
    const present = filteredRecords.filter((record) => record.checkIn).length;
    const absents = filteredRecords.filter((record) => record.status === 'ABSENT').length;
    const absSites = new Set(
      filteredRecords.filter((record) => record.status === 'ABSENT').map((record) => record.site)
    );
    return [
      { title: 'Agents planifiés', value: planned },
      { title: 'Agents pointés', value: present },
      { title: 'Agents absents', value: absents },
      { title: 'Sites impactés', value: absSites.size },
    ];
  }, [filteredRecords, summary, filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (!loading && error && (!summary || !filters)) {
    return <p className="form-error">{error}</p>;
  }

  if (loading || !summary || !filters) {
    return <p>Chargement du tableau de bord...</p>;
  }

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Tableau de bord Madypro Clean</span>
          <h2>Vue synthétique</h2>
          <p>Suivez le plan de charge, la présence terrain et les alertes critiques en temps réel.</p>
        </div>
        <div className="page-hero__accent">
          <h3>Filtres</h3>
          <div className="filter-grid" role="search">
            <label className="filter-field filter-card filter-card--wide">
              Recherche
              <input
                type="text"
                placeholder="Agent, site..."
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
              />
            </label>
            <label className="filter-field filter-card">
              Date
              <input
                type="date"
                value={filters.date}
                onChange={(event) => handleFilterChange('date', event.target.value)}
              />
            </label>
            <label className="filter-field filter-card">
              Site
              <select
                value={filters.site}
                onChange={(event) => handleFilterChange('site', event.target.value)}
              >
                {['all', ...summary.filterOptions.sites].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'Tous' : option}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field filter-card">
              Superviseur
              <select
                value={filters.supervisor}
                onChange={(event) => handleFilterChange('supervisor', event.target.value)}
              >
                {['all', ...summary.filterOptions.supervisors].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'Tous' : option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="page-grid">
        {metrics.map((metric) => (
          <article key={metric.title} className="card">
            <span className="card__meta">{metric.title}</span>
            <p className="card__value">{metric.value}</p>
          </article>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-panels">
        <section className="panel">
          <h3>Alertes</h3>
          <ul className="list-line">
            {summary.alerts.map((alert) => (
              <li key={alert.id}>
                <span>{alert.type}</span>
                <span>{alert.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h3>Planning du jour</h3>
          <div className="table-wrapper">
            <table className="table" aria-label="planning synthétique">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Site</th>
                  <th>Superviseur</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.agent}</td>
                    <td>{record.site}</td>
                    <td>{record.supervisor}</td>
                    <td>
                      <span
                        className={`status-chip ${
                          record.status === 'ON_TIME'
                            ? 'status-chip--success'
                            : record.status === 'LATE'
                            ? 'status-chip--warning'
                            : 'status-chip--info'
                        }`}
                      >
                        {record.status === 'ON_TIME'
                          ? `Présent ${record.checkIn}`
                          : record.status === 'LATE'
                          ? `Retard ${record.checkIn}`
                          : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
