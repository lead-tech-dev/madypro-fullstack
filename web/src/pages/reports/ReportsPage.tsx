import React, { useEffect, useMemo, useState } from 'react';
import { Download, Send } from 'lucide-react';
import {
  getBillingReport,
  getPayrollBreakdown,
  getPayrollCsv,
  getPeriodComparison,
  getPerformanceReport,
  getSiteBenchmark,
  pushPayrollBreakdown,
  sendReportByEmail,
} from '../../services/api/reports.api';
import { BillingReportRow, PayrollBreakdownRow, PeriodComparison, ReportsPerformance, SiteBenchmarkRow } from '../../types/report';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

const minutesToHoursLabel = (minutes: number) => `${(minutes / 60).toFixed(1)} h`;

const downloadTextFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadTextFile(filename, csv);
};

export const ReportsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [filters, setFilters] = useState({ startDate: formatDate(defaultStart), endDate: formatDate(today) });
  const [data, setData] = useState<ReportsPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payrollBreakdown, setPayrollBreakdown] = useState<PayrollBreakdownRow[]>([]);
  const [pushingPayroll, setPushingPayroll] = useState(false);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [billing, setBilling] = useState<BillingReportRow[]>([]);
  const [benchmark, setBenchmark] = useState<SiteBenchmarkRow[]>([]);

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

  useEffect(() => {
    if (!token) return;
    getPayrollBreakdown(token, filters)
      .then(setPayrollBreakdown)
      .catch(() => setPayrollBreakdown([]));
  }, [token, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (!token) return;
    getPeriodComparison(token, filters)
      .then(setComparison)
      .catch(() => setComparison(null));
    getBillingReport(token, filters)
      .then(setBilling)
      .catch(() => setBilling([]));
  }, [token, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (!token) return;
    getSiteBenchmark(token)
      .then(setBenchmark)
      .catch(() => setBenchmark([]));
  }, [token]);

  const handlePushPayroll = async () => {
    if (!token) return;
    setPushingPayroll(true);
    try {
      const result = await pushPayrollBreakdown(token, filters);
      notify(`Envoyé au prestataire de paie (${result.agentCount} agent(s))`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'envoi au prestataire de paie";
      notify(message, 'error');
    } finally {
      setPushingPayroll(false);
    }
  };

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
      ['Site', 'Heures totales', 'Agents', 'Jours non couverts'],
      ...data.siteReports.map((site) => [
        site.name,
        minutesToHoursLabel(site.totalMinutes),
        site.agents.join(' / '),
        site.uncoveredDays.toString(),
      ]),
    ];
    downloadCsv(`rapport-sites-${filters.startDate}-${filters.endDate}.csv`, rows);
  };

  const [sendingReport, setSendingReport] = useState(false);

  const handleSendReport = async () => {
    if (!token) return;
    setSendingReport(true);
    try {
      const result = await sendReportByEmail(token, filters);
      if (result.sent > 0) {
        notify(`Rapport envoyé à ${result.sent}/${result.recipients} destinataire(s)`);
      } else {
        notify(`Échec de l'envoi (${result.failed}/${result.recipients}) — vérifiez la config SendGrid`, 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'envoyer le rapport";
      notify(message, 'error');
    } finally {
      setSendingReport(false);
    }
  };

  const exportPayroll = async () => {
    if (!token) return;
    try {
      const csv = await getPayrollCsv(token, filters);
      downloadTextFile(`export-paie-${filters.startDate}-${filters.endDate}.csv`, csv);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de générer l'export paie";
      notify(message, 'error');
    }
  };

  const summaryCards = useMemo(() => {
    if (!data) return [];
    const totalHours = minutesToHoursLabel(data.totals.totalMinutes);
    const pct = (value: number | null) => (value === null ? '—' : `${value}%`);
    return [
      { title: 'Heures totales', value: totalHours },
      { title: 'Agents actifs', value: data.agentReports.length },
      { title: 'Sites couverts', value: data.siteReports.length },
      { title: 'Ponctualité', value: pct(data.kpis.punctualityRate) },
      { title: 'Absentéisme', value: pct(data.kpis.absenteeismRate) },
      { title: 'Taux de réalisation', value: pct(data.kpis.realizationRate) },
    ];
  }, [data]);

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Rapports & exports</span>
          <h2>Préparez la paie et la facturation</h2>
          <p>Produisez en un clic des indicateurs agents et sites pour la période de votre choix.</p>
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
          {comparison && (
            <section className="panel">
              <h3>Comparaison de périodes</h3>
              <p>
                Période actuelle : {comparison.current.period.startDate} → {comparison.current.period.endDate} · Période
                précédente : {comparison.previous.period.startDate} → {comparison.previous.period.endDate}
              </p>
              <div className="page-grid">
                {(
                  [
                    { key: 'punctualityRate', label: 'Ponctualité' },
                    { key: 'absenteeismRate', label: 'Absentéisme' },
                    { key: 'realizationRate', label: 'Taux de réalisation' },
                  ] as const
                ).map(({ key, label }) => {
                  const currentValue = comparison.current.kpis[key];
                  const delta = comparison.deltas[key];
                  const positive = delta != null && delta >= 0;
                  return (
                    <article key={key} className="card">
                      <span className="card__meta">{label}</span>
                      <p className="card__value">{currentValue == null ? '—' : `${currentValue}%`}</p>
                      {delta != null && (
                        <span style={{ color: positive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {positive ? '▲' : '▼'} {Math.abs(delta)}%
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3>Rapport par agent</h3>
                <p>Heures travaillées, jours couverts et absences pour chaque agent.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="button" variant="ghost" icon={Download} onClick={exportAgents}>
                  Export CSV
                </Button>
                <Button type="button" icon={Download} onClick={exportPayroll}>
                  Export paie
                </Button>
                <Button type="button" variant="ghost" icon={Send} onClick={handleSendReport} disabled={sendingReport}>
                  {sendingReport ? 'Envoi...' : 'Envoyer par e-mail'}
                </Button>
              </div>
            </div>
            <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
              Un rapport est aussi envoyé automatiquement chaque lundi (hebdomadaire) et le 1er du mois
              (mensuel) aux admins et superviseurs.
            </p>
            <div className="table-wrapper">
              <table className="table" aria-label="rapport par agent">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Heures totales</th>
                    <th>Jours travaillés</th>
                    <th>Heures d'absence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentReports.map((agent) => (
                    <tr key={agent.id}>
                      <td>{agent.name}</td>
                      <td>{minutesToHoursLabel(agent.totalMinutes)}</td>
                      <td>{agent.workingDays}</td>
                      <td>{minutesToHoursLabel(agent.absenceMinutes)}</td>
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
              <Button type="button" variant="ghost" icon={Download} onClick={exportSites}>
                Export CSV
              </Button>
            </div>
            <div className="table-wrapper">
              <table className="table" aria-label="rapport par site">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Heures totales</th>
                    <th>Agents</th>
                    <th>Jours non couverts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.siteReports.map((site) => (
                    <tr key={site.id}>
                      <td>{site.name}</td>
                      <td>{minutesToHoursLabel(site.totalMinutes)}</td>
                      <td>{site.agents.join(', ')}</td>
                      <td>{site.uncoveredDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {billing.length > 0 && (
            <section className="panel">
              <h3>Rapport de facturation</h3>
              <p>Heures facturables et internes par site.</p>
              <div className="table-wrapper">
                <table className="table" aria-label="rapport de facturation">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Heures facturables</th>
                      <th>Heures internes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.map((row) => (
                      <tr key={row.siteId}>
                        <td>{row.siteName}</td>
                        <td>{row.billableHours} h</td>
                        <td>{row.internalHours} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {benchmark.length > 0 && (
            <section className="panel">
              <h3>Benchmark inter-sites (90 derniers jours)</h3>
              <p>Sites classés par taux de complétion.</p>
              <div className="table-wrapper">
                <table className="table" aria-label="benchmark inter-sites">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Interventions</th>
                      <th>Taux de complétion</th>
                      <th>Anomalies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.map((row) => (
                      <tr key={row.siteId}>
                        <td>{row.siteName}</td>
                        <td>{row.interventionsTotal}</td>
                        <td>{row.completionRate == null ? '—' : `${row.completionRate}%`}</td>
                        <td>{row.anomalyCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {payrollBreakdown.length > 0 && (
            <section className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3>Paie détaillée</h3>
                  <p>Heures normales, nuit, dimanche et jours fériés par agent.</p>
                </div>
                <Button type="button" icon={Send} onClick={handlePushPayroll} disabled={pushingPayroll}>
                  {pushingPayroll ? 'Envoi...' : 'Envoyer au prestataire de paie'}
                </Button>
              </div>
              <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                Nécessite un webhook « payroll.export » configuré (voir Paramètres → Webhooks).
              </p>
              <div className="table-wrapper">
                <table className="table" aria-label="paie détaillée">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Normal</th>
                      <th>Nuit</th>
                      <th>Dimanche</th>
                      <th>Férié</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollBreakdown.map((row) => (
                      <tr key={row.agentEmail}>
                        <td>{row.agentName}</td>
                        <td>{row.normalHours} h</td>
                        <td>{row.nightHours} h</td>
                        <td>{row.sundayHours} h</td>
                        <td>{row.holidayHours} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
