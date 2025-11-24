import React, { useEffect, useMemo, useState } from 'react';
import { getPerformanceReport } from '../../services/api/reports.api';
import { ReportsPerformance } from '../../types/report';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

const minutesToHoursLabel = (minutes: number) => `${(minutes / 60).toFixed(1)} h`;

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const ReportsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [filters, setFilters] = useState({ startDate: formatDate(defaultStart), endDate: formatDate(today) });
  const [data, setData] = useState<ReportsPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = () => {
    if (!token) return;
    setLoading(true);
    getPerformanceReport(token, filters)
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les rapports';
        setError(message);
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPerformance();
  }, [token, filters.startDate, filters.endDate]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const exportAgents = () => {
    if (!data) return;
    const rows = [
      ['Agent', 'Heures totales', 'Jours travaillés', 'Heures absence'],
      ...data.agentReports.map((agent) => [
        agent.name,
        minutesToHoursLabel(agent.totalMinutes),
        agent.workingDays.toString(),
        minutesToHoursLabel(agent.absenceMinutes),
      ]),
    ];
    downloadCsv(`rapport-agents-${filters.startDate}-${filters.endDate}.csv`, rows);
  };

  const exportSites = () => {
    if (!data) return;
    const rows = [
      ['Site', 'Client', 'Heures totales', 'Agents', 'Jours non couverts'],
      ...data.siteReports.map((site) => [
        site.name,
        site.clientName,
        minutesToHoursLabel(site.totalMinutes),
        site.agents.join(' / '),
        site.uncoveredDays.toString(),
      ]),
    ];
    downloadCsv(`rapport-sites-${filters.startDate}-${filters.endDate}.csv`, rows);
  };

  const summaryCards = useMemo(() => {
    if (!data) return [];
    const totalHours = minutesToHoursLabel(data.totals.totalMinutes);
    return [
      { title: 'Heures totales', value: totalHours },
      { title: 'Agents actifs', value: data.agentReports.length },
      { title: 'Sites couverts', value: data.siteReports.length },
    ];
  }, [data]);

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Rapports & exports</span>
          <h2>Préparez la paie et la facturation</h2>
          <p>Produisez en un clic des indicateurs agents, sites et clients pour la période de votre choix.</p>
        </div>
        <div className="page-hero__accent">
          <h3>Période</h3>
          <div className="filter-grid" style={{ marginBottom: 0 }}>
            <label className="filter-field filter-card">
              Du
-             <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
+             <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
            </label>
            <label className="filter-field filter-card">
              Au
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
            </label>
          </div>
        </div>
      </div>

      {summaryCards.length > 0 && (
        <div className="page-grid">
          {summaryCards.map((card) => (
            <article key={card.title} className="card">
              <span className="card__meta">{card.title}</span>
              <p className="card__value">{card.value}</p>
            </article>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement des rapports...</p>}

      {data && !loading && (
        <>
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3>Rapport par agent</h3>
                <p>Heures travaillées, jours couverts et absences pour chaque agent.</p>
              </div>
              <Button type="button" variant="ghost" onClick={exportAgents}>
                Export CSV
              </Button>
            </div>
            <div className="table-wrapper">
              <table className="table" aria-label="rapport par agent">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Heures totales</th>
                    <th>Jours travaillés</th>
                    <th>Heures d'absence</th>
                    <th>Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentReports.map((agent) => (
                    <tr key={agent.id}>
                      <td>{agent.name}</td>
                      <td>{minutesToHoursLabel(agent.totalMinutes)}</td>
                      <td>{agent.workingDays}</td>
                      <td>{minutesToHoursLabel(agent.absenceMinutes)}</td>
                      <td>
                        <ul className="list-line" style={{ border: 'none' }}>
                          {agent.clients.map((client) => (
                            <li key={client.name} style={{ border: 'none', padding: '0.25rem 0' }}>
                              {client.name} <span>{minutesToHoursLabel(client.minutes)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3>Rapport par site</h3>
                <p>Heures réalisées, agents intervenus et jours non couverts.</p>
              </div>
              <Button type="button" variant="ghost" onClick={exportSites}>
                Export CSV
              </Button>
            </div>
            <div className="table-wrapper">
              <table className="table" aria-label="rapport par site">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Client</th>
                    <th>Heures totales</th>
                    <th>Agents</th>
                    <th>Jours non couverts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.siteReports.map((site) => (
                    <tr key={site.id}>
                      <td>{site.name}</td>
                      <td>{site.clientName}</td>
                      <td>{minutesToHoursLabel(site.totalMinutes)}</td>
                      <td>{site.agents.join(', ')}</td>
                      <td>{site.uncoveredDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h3>Vue synthèse par client</h3>
            <div className="table-wrapper">
              <table className="table" aria-label="synthèse clients">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Heures totales</th>
                  </tr>
                </thead>
                <tbody>
                  {data.totals.clients.map((client) => (
                    <tr key={client.name}>
                      <td>{client.name}</td>
                      <td>{minutesToHoursLabel(client.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
