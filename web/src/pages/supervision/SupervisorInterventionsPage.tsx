import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listInterventions, updateIntervention } from '../../services/api/interventions.api';
import { listSites } from '../../services/api/sites.api';
import { listAttendance } from '../../services/api/attendance.api';
import { Intervention } from '../../types/intervention';
import { Site } from '../../types/site';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/datetime';

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
  const [observationDraft, setObservationDraft] = useState('');
  const [photoDraft, setPhotoDraft] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
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
    // si l’API ne remplit pas supervisorIds, on ne filtre pas côté front pour ne pas masquer les interventions
    return ids.length ? new Set(ids) : null;
  }, [sites, user]);

  const filtered = useMemo(() => {
    return interventions.filter((i) => {
      if (supervisedSiteIds && !supervisedSiteIds.has(i.siteId)) return false;
      if (filters.siteId !== 'all' && i.siteId !== filters.siteId) return false;
      if (filters.status !== 'all' && i.status !== filters.status) return false;
      return true;
    });
  }, [filters.siteId, filters.status, interventions, supervisedSiteIds]);

  useEffect(() => {
    if (viewing) {
      setObservationDraft(viewing.observation ?? '');
      setPhotoDraft(viewing.photos ?? []);
      fetchAttendanceForViewing(viewing);
    }
  }, [viewing]);

  const fetchAttendanceForViewing = useCallback(
    (current: Intervention) => {
      if (!token) return;
      const date = current.date;
      const agents = current.agents?.length ? current.agents : [{ id: undefined } as any];
      Promise.all(
        agents.map((agent) =>
          listAttendance(token, {
            siteId: current.siteId,
            agentId: agent.id,
            startDate: date,
            endDate: date,
            pageSize: 50,
          }).catch(() => ({ items: [] })),
        ),
      )
        .then((results) => {
          const collected = results.flatMap((res) => ((res as any).items ?? (Array.isArray(res) ? res : [])) as any[]);
          const allowedAgents = new Set(current.agents.map((a) => a.id));
          const filtered = collected.filter((att) =>
            allowedAgents.size === 0 ? true : allowedAgents.has(att.agent?.id || att.agentId),
          );
          const map = new Map<string, any>();
          filtered.forEach((att: any) => {
            const key = att.agent?.id || att.agentId || att.id;
            const existing = map.get(key);
            map.set(key, {
              ...existing,
              ...att,
              checkInTime: att.checkInTime || existing?.checkInTime,
              checkOutTime: att.checkOutTime || existing?.checkOutTime,
            });
          });
          setAttendance(Array.from(map.values()));
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
    const tasks = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Lecture fichier impossible'));
          reader.readAsDataURL(file);
        }),
    );
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
                      <small style={{ display: 'block', color: 'var(--color-muted)' }}>{intervention.clientName}</small>
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
                <p className="card__meta">{viewing.clientName}</p>
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
                  <td>
                    <textarea
                      value={observationDraft}
                      onChange={(e) => setObservationDraft(e.target.value)}
                      rows={3}
                      className="textarea"
                      placeholder="Ajouter une observation"
                    />
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
              <table className="table" aria-label="pointages intervention">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Début</th>
                    <th>Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((att) => (
                    <tr key={att.id}>
                      <td>{att.agent?.name ?? '—'}</td>
                      <td>{att.checkInTime ? formatDateTime(att.checkInTime) : att.plannedStart ?? '—'}</td>
                      <td>{att.checkOutTime ? formatDateTime(att.checkOutTime) : att.plannedEnd ?? '—'}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                        Aucun pointage associé à cette intervention.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <p className="card__meta">Photos</p>
            <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e.target.files)} />
            {photoDraft.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {photoDraft.map((uri, idx) => (
                  <div key={uri + idx} style={{ position: 'relative' }}>
                    <img
                      src={uri}
                      alt={`photo-${idx + 1}`}
                      style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <button
                      type="button"
                      aria-label="Supprimer la photo"
                      onClick={() => setPhotoDraft((prev) => prev.filter((p) => p !== uri))}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#000',
                        color: '#fff',
                        width: 22,
                        height: 22,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setViewing(null)}>
              Fermer
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!token || !viewing) return;
                try {
                  const payload: any = {
                    observation: observationDraft,
                  };
                  if (photoDraft && photoDraft.length > 0) {
                    payload.photos = photoDraft;
                  }
                  const updated = await updateIntervention(token, viewing.id, payload);
                  setInterventions((prev) => prev.map((i) => (i.id === viewing.id ? updated : i)));
                  setViewing(updated);
                  notify('Observation mise à jour');
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Mise à jour impossible';
                  notify(message, 'error');
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
