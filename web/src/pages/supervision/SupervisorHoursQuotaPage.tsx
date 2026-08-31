import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { downloadHoursQuotaPdf, getHoursQuotaReport } from '../../services/api/reports.api';
import { listSites } from '../../services/api/sites.api';
import { HoursQuotaReport } from '../../types/report';
import { Site } from '../../types/site';
import { Button } from '../../components/ui/Button';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);

const minutesToHoursLabel = (minutes: number) => `${(minutes / 60).toFixed(1)} h`;

export const SupervisorHoursQuotaPage: React.FC = () => {
  const { token, user, notify } = useAuthContext();
  const [filters, setFilters] = useState({ startDate: formatDate(defaultStart), endDate: formatDate(today) });
  const [siteId, setSiteId] = useState('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [data, setData] = useState<HoursQuotaReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    listSites(token, { pageSize: 200 })
      .then((res) => setSites(res.items))
      .catch(() => setSites([]));
  }, [token]);

  const siteOptions = useMemo(() => {
    const mine = user ? sites.filter((s) => s.supervisorIds?.includes(user.id)) : sites;
    return [{ value: 'all', label: 'Tous mes sites' }].concat(mine.map((s) => ({ value: s.id, label: s.name })));
  }, [sites, user]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getHoursQuotaReport(token, { ...filters, siteId })
      .then(setData)
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger le rapport';
        notify(message, 'error');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [token, filters.startDate, filters.endDate, siteId, notify]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownloadPdf = async () => {
    if (!token) return;
    try {
      await downloadHoursQuotaPdf(token, { ...filters, siteId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de générer le PDF';
      notify(message, 'error');
    }
  };

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Rapports</span>
          <h2>Quota d'heures — mes sites</h2>
          <p>Heures planifiées vs réalisées pour les agents des sites dont vous avez la charge.</p>
        </div>
        <div className="page-hero__accent">
          <h3>Période</h3>
          <div className="filter-grid" style={{ marginBottom: 0 }}>
            <label className="filter-field filter-card">
              Du
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
            </label>
            <label className="filter-field filter-card">
              Au
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
            </label>
            <label className="filter-field filter-card">
              Site
              <select value={siteId} onChange={(event) => setSiteId(event.target.value)}>
                {siteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {loading && <p>Chargement du rapport...</p>}

      {data && !loading && (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--color-muted)' }}>
              Seuil d'accomplissement : {data.threshold}% — en dessous, les heures manquantes jusqu'au quota sont comptées en
              pénalité.
            </p>
            <Button type="button" variant="ghost" icon={Download} onClick={handleDownloadPdf}>
              Télécharger PDF
            </Button>
          </div>
          <div className="table-wrapper">
            <table className="table" aria-label="quota d'heures mensuel">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Agent</th>
                  <th>Heures prévues</th>
                  <th>Heures réalisées</th>
                  <th>% accompli</th>
                  <th>Pénalité</th>
                </tr>
              </thead>
              <tbody>
                {data.agentReports.map((agent) => (
                  <tr key={`${agent.siteId}-${agent.userId}`}>
                    <td>{agent.siteName}</td>
                    <td>{agent.name}</td>
                    <td>{minutesToHoursLabel(agent.plannedMinutes)}</td>
                    <td>{minutesToHoursLabel(agent.realizedMinutes)}</td>
                    <td>{agent.accomplishmentRate === null ? '—' : `${agent.accomplishmentRate}%`}</td>
                    <td>
                      {agent.meetsQuota ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Quota atteint</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>-{minutesToHoursLabel(agent.penaltyMinutes)}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.agentReports.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                      Aucune donnée pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
