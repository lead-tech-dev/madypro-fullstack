import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listApprovalRequests, approveRequest, rejectRequest } from '../../services/api/approvals.api';
import { listUsers } from '../../services/api/users.api';
import { listSites } from '../../services/api/sites.api';
import { ApprovalActionType, ApprovalRequest, RecurringBatchPayload } from '../../types/approval';
import { Button } from '../../components/ui/Button';

const ACTION_LABELS: Record<ApprovalActionType, string> = {
  CREATE_INTERVENTION: 'Création d’intervention',
  UPDATE_INTERVENTION_SCHEDULE: 'Modification d’horaire',
  ASSIGN_AGENT: 'Ajout d’agent',
  UNASSIGN_AGENT: 'Retrait d’agent',
  CANCEL_INTERVENTION: 'Annulation d’intervention',
  CREATE_RECURRING_BATCH: 'Génération récurrente',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  SUPERSEDED: 'Remplacée',
};

export const ApprovalsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listApprovalRequests(token, { status: statusFilter === 'all' ? undefined : statusFilter, pageSize: 100 })
      .then((res) => setRequests(res.items))
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les demandes', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, statusFilter]);

  useEffect(() => {
    if (!token) return;
    listUsers(token, { pageSize: 500 })
      .then((res) => {
        const map: Record<string, string> = {};
        res.items.forEach((u) => {
          map[u.id] = `${u.firstName} ${u.lastName}`;
        });
        setAgentNames(map);
      })
      .catch(() => setAgentNames({}));
    listSites(token, { pageSize: 500 })
      .then((res) => {
        const map: Record<string, string> = {};
        res.items.forEach((s) => {
          map[s.id] = s.name;
        });
        setSiteNames(map);
      })
      .catch(() => setSiteNames({}));
  }, [token]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'PENDING').length, [requests]);

  const describe = (req: ApprovalRequest) => {
    const payload = req.payload as any;
    const prev = req.previousState as any;
    switch (req.actionType) {
      case 'CREATE_INTERVENTION':
        return `${payload.date} · ${payload.startTime}–${payload.endTime}${payload.siteId ? ` (site ${payload.siteId})` : ''}`;
      case 'UPDATE_INTERVENTION_SCHEDULE': {
        const beforeLabel = prev ? `${prev.date} ${prev.startTime}–${prev.endTime}` : '—';
        const afterLabel = `${payload.date ?? prev?.date} ${payload.startTime ?? prev?.startTime}–${payload.endTime ?? prev?.endTime}`;
        return `${beforeLabel} → ${afterLabel}`;
      }
      case 'ASSIGN_AGENT':
      case 'UNASSIGN_AGENT': {
        const before: string[] = prev?.agentIds ?? [];
        const after: string[] = payload.agentIds ?? [];
        const added = after.filter((id) => !before.includes(id)).map((id) => agentNames[id] ?? id);
        const removed = before.filter((id) => !after.includes(id)).map((id) => agentNames[id] ?? id);
        const parts: string[] = [];
        if (added.length) parts.push(`+ ${added.join(', ')}`);
        if (removed.length) parts.push(`− ${removed.join(', ')}`);
        return parts.join(' · ') || 'Aucun changement détecté';
      }
      case 'CANCEL_INTERVENTION':
        return `Motif : ${payload.observation}`;
      case 'CREATE_RECURRING_BATCH': {
        const batch = payload as RecurringBatchPayload;
        const siteLabel = siteNames[batch.siteId] ?? batch.siteId;
        const agentLabels = (batch.agentIds ?? []).map((id) => agentNames[id] ?? id).join(', ') || 'aucun agent';
        return `${batch.ruleLabel ?? 'Règle'} — ${siteLabel} — ${batch.occurrences?.length ?? 0} occurrence(s) — ${batch.startTime}–${batch.endTime} — ${agentLabels}`;
      }
      default:
        return '';
    }
  };

  const handleApprove = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await approveRequest(token, id);
      notify('Demande approuvée et appliquée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’approuver cette demande', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    const comment = window.prompt('Motif du refus ?');
    if (!comment) {
      notify('Motif obligatoire', 'error');
      return;
    }
    setBusyId(id);
    try {
      await rejectRequest(token, id, comment);
      notify('Demande refusée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de refuser cette demande', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Validation</span>
        <h2>Demandes de validation</h2>
        <p>Actions planning proposées par les superviseurs, en attente d’une décision admin.</p>
      </div>

      <div className="page-grid" style={{ marginBottom: '1rem' }}>
        <article className="card">
          <span className="card__meta">En attente</span>
          <p className="card__value">{pendingCount}</p>
          <p className="card__meta">{loading ? 'Chargement...' : 'À traiter'}</p>
        </article>
      </div>

      <div className="filter-grid" style={{ marginBottom: '1rem' }}>
        <label className="filter-field filter-card">
          Statut
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvées</option>
            <option value="REJECTED">Refusées</option>
            <option value="SUPERSEDED">Remplacées</option>
            <option value="all">Toutes</option>
          </select>
        </label>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table className="table" aria-label="demandes de validation">
            <thead>
              <tr>
                <th>Demandeur</th>
                <th>Action</th>
                <th>Détail</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.requestedByName ?? req.requestedById}</td>
                  <td>{ACTION_LABELS[req.actionType] ?? req.actionType}</td>
                  <td>
                    {describe(req)}
                    {req.actionType === 'CREATE_RECURRING_BATCH' && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--color-primary, #0E8E7C)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            textDecoration: 'underline',
                          }}
                        >
                          {expandedId === req.id ? 'Masquer les dates' : 'Voir les dates'}
                        </button>
                        {expandedId === req.id && (
                          <div className="card__meta" style={{ marginTop: '0.35rem', maxWidth: 320 }}>
                            {((req.payload as RecurringBatchPayload).occurrences ?? []).map((o) => o.date).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-chip ${
                        req.status === 'PENDING'
                          ? 'status-chip--info'
                          : req.status === 'APPROVED'
                          ? 'status-chip--success'
                          : 'status-chip--warning'
                      }`}
                    >
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                    {req.status !== 'PENDING' && req.reviewComment && (
                      <div className="card__meta" style={{ marginTop: '0.25rem' }}>
                        {req.reviewComment}
                      </div>
                    )}
                  </td>
                  <td>{new Date(req.createdAt).toLocaleString('fr-FR')}</td>
                  <td>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button
                          type="button"
                          className="btn--compact"
                          disabled={busyId === req.id}
                          onClick={() => handleApprove(req.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="btn--compact"
                          disabled={busyId === req.id}
                          onClick={() => handleReject(req.id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    ) : (
                      <span className="card__meta">
                        {req.reviewedByName ? `Par ${req.reviewedByName}` : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    Aucune demande pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
