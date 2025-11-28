import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAbsence, updateAbsenceStatus } from '../../services/api/absences.api';
import { Absence, AbsenceStatus } from '../../types/absence';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const AbsenceDetailPage: React.FC = () => {
  const { id } = useParams();
  const { token, notify } = useAuthContext();
  const [absence, setAbsence] = useState<Absence | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadDetail = () => {
    if (!token || !id) return;
    setLoading(true);
    getAbsence(token, id)
      .then((data) => setAbsence(data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Absence introuvable';
        notify(message, 'error');
        setAbsence(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [token, id]);

  const handleDecision = async (status: AbsenceStatus) => {
    if (!token || !id) return;
    const comment = window.prompt('Commentaire (optionnel) ?') ?? undefined;
    try {
      await updateAbsenceStatus(token, id, { status, validatedBy: 'Admin Madypro', comment });
      notify(status === 'APPROVED' ? 'Demande approuvée' : 'Demande rejetée');
      loadDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action impossible';
      notify(message, 'error');
    }
  };

  if (loading) {
    return <p>Chargement...</p>;
  }

  if (!absence) {
    return (
      <div>
        <div className="page-header">
          <span className="pill">Absences</span>
          <h2>Absence introuvable</h2>
        </div>
        <Link to="/absences" className="btn btn--ghost">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="pill">Absences</span>
        <h2>{absence.agent.name}</h2>
        <p>
          {absence.from} → {absence.to}
        </p>
      </div>

      <section className="panel detail-grid">
        <div className="detail-grid__item">
          <span>Type</span>
          <strong>{absence.type}</strong>
        </div>
        <div className="detail-grid__item">
          <span>Statut</span>
          <strong>{absence.status}</strong>
          {absence.validatedBy && <small>Validé par {absence.validatedBy}</small>}
        </div>
        <div className="detail-grid__item">
          <span>Motif</span>
          <strong>{absence.reason}</strong>
        </div>
        {absence.site && (
          <div className="detail-grid__item">
            <span>Site</span>
            <strong>{absence.site.name}</strong>
          </div>
        )}
        <div className="detail-grid__item">
          <span>Note</span>
          <strong>{absence.note ?? '—'}</strong>
          {absence.validationComment && <small>Commentaire: {absence.validationComment}</small>}
        </div>
        <div className="detail-grid__item">
          <span>Origine</span>
          <strong>{absence.manual ? 'Saisie admin' : `Demande ${absence.createdBy}`}</strong>
        </div>
      </section>

      {absence.status === 'PENDING' && (
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <Button type="button" onClick={() => handleDecision('APPROVED')}>
            Approuver
          </Button>
          <Button type="button" variant="ghost" onClick={() => handleDecision('REJECTED')}>
            Rejeter
          </Button>
        </div>
      )}

      <Button type="button" variant="ghost" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/absences')}>
        Retour
      </Button>
    </div>
  );
};
