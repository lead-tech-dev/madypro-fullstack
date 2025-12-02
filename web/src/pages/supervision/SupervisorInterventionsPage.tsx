import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listInterventions, updateIntervention } from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { listAttendance, updateAttendance as updateAttendanceApi } from '../../services/api/attendance.api';
import { Intervention } from '../../types/intervention';
import { Site } from '../../types/site';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageSlider } from '../../components/ui/ImageSlider';
import { compressImageFile } from '../../utils/image';
import { formatDateTime } from '../../utils/datetime';

const formatHour = (value?: string | null) => {
  if (!value) return '—';
  const d = value.includes('T') ? new Date(value) : new Date(`1970-01-01T${value}`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const timeValue = (value?: string | null) => {
  if (!value) return '';
  if (value.includes('T')) return value.slice(11, 16);
  return value;
};

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const today = todayLocal();

export const SupervisorInterventionsPage: React.FC = () => {
  const { token, user, notify } = useAuthContext();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Intervention | null>(null);
  const [photoDraft, setPhotoDraft] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, { checkInTime?: string; checkOutTime?: string }>>({});
  const [filters, setFilters] = useState<{ siteId: string; date: string; status: string }>({
    siteId: 'all',
    date: today,
    status: 'all',
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      listInterventions(token, {
        startDate: filters.date,
        endDate: filters.date,
        status: filters.status !== 'all' ? (filters.status as any) : undefined,
        pageSize: 200,
      }).catch(() => ({
        items: [],
      })),
      listSites(token, { pageSize: 200 }).catch(() => ({ items: [] as Site[] })),
    ])
      .then(([intRes, sitesRes]) => {
        setInterventions((intRes as any).items ?? (Array.isArray(intRes) ? intRes : []));
        setSites((sitesRes as any).items ?? (sitesRes as Site[]));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les interventions';
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [token, filters.date, notify]);

  const supervisedSiteIds = useMemo(() => {
    if (!user || user.role?.toUpperCase() !== 'SUPERVISOR') return null;
    const ids = sites.filter((s) => s.supervisorIds?.includes(user.id)).map((s) => s.id);
    return new Set(ids);
  }, [sites, user]);

  const filtered = useMemo(() => {
    return interventions.filter((i) => {
      if (supervisedSiteIds && !supervisedSiteIds.has(i.siteId)) return false;
      if (filters.siteId !== 'all' && i.siteId !== filters.siteId) return false;
      if (filters.status !== 'all' && i.status !== filters.status) return false;
      return true;
    });
  }, [filters.siteId, filters.status, interventions, supervisedSiteIds]);

  const attendanceByAgent = useMemo(() => {
    const map = new Map<string, any>();
    attendance.forEach((att) => {
      const id = att.agent?.id || att.agentId || att.id;
      if (id && !map.has(id)) {
        map.set(id, att);
      }
    });
    return Array.from(map.values());
  }, [attendance]);

  const filterAttendanceForIntervention = useCallback(
    (list: any[], intervention: Intervention) => {
      return list.filter((att) => att.interventionId === intervention.id);
    },
    [],
  );

  useEffect(() => {
    if (viewing) {
      setPhotoDraft(viewing.photos ?? []);
      fetchAttendanceForViewing(viewing);
    }
  }, [viewing]);

  useEffect(() => {
    setAttendanceEdits({});
  }, [viewing?.id]);

  const fetchAttendanceForViewing = useCallback(
    (current: Intervention) => {
      if (!token) return;
      const date = current.date;
      listAttendance(token, {
        siteId: current.siteId,
        startDate: date,
        endDate: date,
        status: 'all',
        pageSize: 200,
      })
        .then((res) => {
          const items = (res as any)?.items ?? (Array.isArray(res) ? res : []);
          const allowedAgents = new Set(current.agents.map((a) => a.id).filter(Boolean));
          const filtered = allowedAgents.size
            ? items.filter((att: any) => allowedAgents.has(att.agent?.id || att.agentId))
            : items;
          setAttendance(filtered);
        })
        .catch(() => setAttendance([]));
    },
    [token],
  );

  useEffect(() => {
    if (!viewing) return;
    const interval = setInterval(() => fetchAttendanceForViewing(viewing), 20000);
    return () => clearInterval(interval);
  }, [viewing, fetchAttendanceForViewing]);

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const tasks = Array.from(files).map((file) => compressImageFile(file));
    Promise.all(tasks)
      .then((base64) => setPhotoDraft((prev) => [...prev, ...base64]))
      .catch(() => notify('Impossible de charger les photos', 'error'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Supervision</span>
        <h2>Interventions</h2>
        <p>Gestion des interventions (planifiées, en cours, terminées) sur vos sites.</p>
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
        <label className="filter-field filter-card">
          Statut
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">Tous</option>
            <option value="PLANNED">Planifiée</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminée</option>
            <option value="NEEDS_REVIEW">À valider</option>
            <option value="CANCELLED">Annulée</option>
            <option value="NO_SHOW">Non effectuée</option>
          </select>
        </label>
      </div>

      <div className="panel">
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="interventions supervisées">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Horaire</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Agents</th>
                  <th>Observation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((intervention) => (
                  <tr key={intervention.id}>
                    <td>
                      <strong>{intervention.siteName}</strong>
                    </td>
                    <td>
                      {formatDateTime(intervention.date)} · {intervention.startTime} – {intervention.endTime}
                    </td>
                    <td>{intervention.type === 'REGULAR' ? 'Régulière' : 'Ponctuelle'}</td>
                    <td>
                      <span className={`status-chip ${intervention.status === 'COMPLETED' ? 'status-chip--success' : intervention.status === 'IN_PROGRESS' ? 'status-chip--warning' : 'status-chip--info'}`}>
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
                    <td>{intervention.agents.map((a) => a.name).join(', ') || '—'}</td>
                    <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {intervention.observation ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          onClick={() => setViewing(intervention)}
                        >
                          Visualiser
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          disabled={
                            intervention.status === 'COMPLETED' ||
                            intervention.status === 'CANCELLED' ||
                            intervention.status === 'IN_PROGRESS' ||
                            intervention.status === 'NO_SHOW'
                          }
                          onClick={async () => {
                            if (!token) return;
                            try {
                              const updated = await updateIntervention(token, intervention.id, { status: 'IN_PROGRESS' });
                              setInterventions((prev) => prev.map((i) => (i.id === intervention.id ? updated : i)));
                              notify('Marquée en cours');
                            } catch (err) {
                              const message = err instanceof Error ? err.message : 'Action impossible';
                              notify(message, 'error');
                            }
                          }}
                        >
                          Démarrer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          disabled={
                            intervention.status === 'COMPLETED' ||
                            intervention.status === 'CANCELLED' ||
                            intervention.status === 'NO_SHOW' ||
                            intervention.status === 'PLANNED'
                          }
                          onClick={async () => {
                            if (!token) return;
                            try {
                              const updated = await updateIntervention(token, intervention.id, { status: 'COMPLETED' });
                              setInterventions((prev) => prev.map((i) => (i.id === intervention.id ? updated : i)));
                              notify('Marquée terminée');
                            } catch (err) {
                              const message = err instanceof Error ? err.message : 'Action impossible';
                              notify(message, 'error');
                            }
                          }}
                        >
                          Terminer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                      Aucune intervention pour les filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <p className="card__meta">Intervention</p>
                <h3 style={{ margin: 0 }}>{viewing.siteName}</h3>
              </div>
              <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
                Fermer
              </Button>
            </div>
          <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
              <table className="table" aria-label="détails intervention">
                <tbody>
                  <tr>
                    <th>Statut</th>
                    <td>
                      <span
                        className={`status-chip ${
                          viewing.status === 'COMPLETED'
                            ? 'status-chip--success'
                            : viewing.status === 'IN_PROGRESS'
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
                        }[viewing.status] || viewing.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Date / horaires</th>
                    <td>
                      {formatDateTime(viewing.date)} · {viewing.startTime} – {viewing.endTime}
                    </td>
                  </tr>
                  <tr>
                    <th>Type</th>
                    <td>{viewing.type === 'REGULAR' ? 'Régulière' : 'Ponctuelle'} {viewing.subType ? `· ${viewing.subType}` : ''}</td>
                  </tr>
                  <tr>
                    <th>Camions</th>
                    <td>{viewing.truckLabels?.length ? viewing.truckLabels.join(', ') : '—'}</td>
                  </tr>
                  <tr>
                    <th>Observation</th>
                    <td>{viewing.observation || '—'}</td>
                  </tr>
                </tbody>
              </table>
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
                <p>{viewing.truckLabels?.join(', ') || '—'}</p>
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
                    {viewing.agents.map((agent) => {
                      const fallback = filterAttendanceForIntervention(attendanceByAgent, viewing).find(
                        (att) => att.agent?.id === agent.id,
                      );
                      const attendanceId = agent.attendanceId ?? fallback?.id;
                      const arrival = formatHour(agent.arrivalTime ?? fallback?.arrivalTime);
                      const startValue = attendanceEdits[attendanceId ?? '']?.checkInTime ?? timeValue(agent.checkInTime ?? fallback?.checkInTime);
                      const endValue = attendanceEdits[attendanceId ?? '']?.checkOutTime ?? timeValue(agent.checkOutTime ?? fallback?.checkOutTime);
                      return (
                        <tr key={agent.id}>
                          <td>{agent.name}</td>
                          <td>{arrival}</td>
                          <td>
                            {viewing.status === 'NEEDS_REVIEW' && attendanceId ? (
                              <input
                                type="time"
                                value={startValue}
                                onChange={(e) =>
                                  setAttendanceEdits((prev) => ({
                                    ...prev,
                                    [attendanceId]: { ...prev[attendanceId], checkInTime: e.target.value },
                                  }))
                                }
                              />
                            ) : (
                              formatHour(agent.checkInTime ?? fallback?.checkInTime)
                            )}
                          </td>
                          <td>
                            {viewing.status === 'NEEDS_REVIEW' && attendanceId ? (
                              <input
                                type="time"
                                value={endValue}
                                onChange={(e) =>
                                  setAttendanceEdits((prev) => ({
                                    ...prev,
                                    [attendanceId]: { ...prev[attendanceId], checkOutTime: e.target.value },
                                  }))
                                }
                              />
                            ) : (
                              formatHour(agent.checkOutTime ?? fallback?.checkOutTime)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!viewing.agents.length && (
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

            {viewing.status === 'NEEDS_REVIEW' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <Button type="button" variant="ghost" onClick={() => setAttendanceEdits({})}>
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!token || !viewing) return;
                    const entries = Object.entries(attendanceEdits).filter(
                      ([, edit]) => edit.checkInTime || edit.checkOutTime,
                    );
                    for (const [attId, edit] of entries) {
                      await updateAttendanceApi(token, attId, {
                        checkInTime: edit.checkInTime,
                        checkOutTime: edit.checkOutTime,
                      });
                    }
                    const refreshed = await listAttendance(token, {
                      siteId: viewing.siteId,
                      startDate: viewing.date,
                      endDate: viewing.date,
                      status: 'all',
                      pageSize: 200,
                    });
                    const items = (refreshed as any)?.items ?? (Array.isArray(refreshed) ? refreshed : []);
                    const allowedAgents = new Set(viewing.agents.map((a) => a.id).filter(Boolean));
                    const filtered = allowedAgents.size
                      ? items.filter((att: any) => allowedAgents.has(att.agent?.id || att.agentId))
                      : items;
                    setAttendance(filtered);
                    setAttendanceEdits({});
                    setViewing((prev) =>
                      prev
                        ? {
                            ...prev,
                            agents: prev.agents.map((agent) => {
                              const att = filtered.find((a: any) => a.agent?.id === agent.id);
                              return att
                                ? {
                                    ...agent,
                                    arrivalTime: att.arrivalTime ?? agent.arrivalTime,
                                    checkInTime: att.checkInTime ?? agent.checkInTime,
                                    checkOutTime: att.checkOutTime ?? agent.checkOutTime,
                                  }
                                : agent;
                            }),
                          }
                        : prev,
                    );
                    notify('Corrections enregistrées');
                  }}
                >
                  Enregistrer corrections
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
                Fermer
              </Button>
            </div>
        </div>
      </div>
    )}
    </div>
  );
};
