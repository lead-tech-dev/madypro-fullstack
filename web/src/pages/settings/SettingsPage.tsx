import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { AttendanceRules, SettingsSummary, AbsenceTypeConfig } from '../../types/settings';
import {
  getSettings,
  updateAttendanceRules,
  createAbsenceType,
  updateAbsenceType,
} from '../../services/api/settings.api';

export const SettingsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [data, setData] = useState<SettingsSummary | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceRules | null>(null);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeConfig[]>([]);
  const [newType, setNewType] = useState({ code: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [creatingType, setCreatingType] = useState(false);

  const fetchSettings = () => {
    if (!token) return;
    setLoading(true);
    getSettings(token)
      .then((settings) => {
        setData(settings);
        setAttendanceForm(settings.attendanceRules);
        setAbsenceTypes(settings.absenceTypes);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les paramètres';
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleAttendanceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAttendanceForm((prev) => (prev ? { ...prev, [name]: Number(value) } : prev));
  };

  const saveAttendanceRules = async () => {
    if (!token || !attendanceForm) return;
    setSavingRules(true);
    try {
      const updated = await updateAttendanceRules(token, attendanceForm);
      notify('Règles de pointage mises à jour');
      setAttendanceForm(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mise à jour impossible';
      notify(message, 'error');
    } finally {
      setSavingRules(false);
    }
  };

  const handleAbsenceEdit = (id: string, updates: Partial<AbsenceTypeConfig>) => {
    setAbsenceTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, ...updates } : type))
    );
  };

  const persistAbsenceType = async (type: AbsenceTypeConfig) => {
    if (!token) return;
    try {
      await updateAbsenceType(token, type.code, { name: type.name, active: type.active });
      notify('Type mis à jour');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de la mise à jour';
      notify(message, 'error');
      fetchSettings();
    }
  };

  const submitNewType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !newType.code.trim() || !newType.name.trim()) {
      notify('Veuillez renseigner code et nom', 'error');
      return;
    }
    setCreatingType(true);
    try {
      await createAbsenceType(token, {
        code: newType.code.trim(),
        name: newType.name.trim(),
      });
      notify('Type ajouté');
      setNewType({ code: '', name: '' });
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d’ajouter le type';
      notify(message, 'error');
    } finally {
      setCreatingType(false);
    }
  };

  const absenceTypeRows = useMemo(
    () =>
      absenceTypes.map((type) => (
        <tr key={type.id}>
          <td>{type.code}</td>
          <td>
            <input
              className="settings-table-input"
              type="text"
              value={type.name}
              onChange={(event) => handleAbsenceEdit(type.id, { name: event.target.value })}
              onBlur={() => {
                const current = absenceTypes.find((item) => item.id === type.id);
                if (current) {
                  persistAbsenceType(current);
                }
              }}
            />
          </td>
          <td>
            <label className="settings-toggle" style={{ justifyContent: 'flex-start' }}>
              <input
                type="checkbox"
                checked={type.active}
                onChange={(event) => {
                  const next = { ...type, active: event.target.checked };
                  handleAbsenceEdit(type.id, { active: next.active });
                  persistAbsenceType(next);
                }}
              />
              <span style={{ textTransform: 'none' }}>{type.active ? 'Actif' : 'Inactif'}</span>
            </label>
          </td>
        </tr>
      )),
    [absenceTypes]
  );

  if (loading || !data || !attendanceForm) {
    return <p>Chargement des paramètres...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <span className="pill">Paramètres</span>
        <h2>Règles métier Madypro Clean</h2>
        <p>Définissez les règles de pointage, listes d’absences et permissions par rôle.</p>
      </div>

      <div className="settings-grid">
        <article className="settings-card" style={{ gridColumn: 'span 2' }}>
          <span className="card__meta">Pointage</span>
          <h3>Règles de proximité & horaires</h3>
          <div className="form-row">
            <Input
              id="gpsDistance"
              name="gpsDistanceMeters"
              label="Distance GPS max (m)"
              type="number"
              min={10}
              value={attendanceForm.gpsDistanceMeters}
              onChange={handleAttendanceChange}
            />
            <Input
              id="tolerance"
              name="toleranceMinutes"
              label="Tolérance (min)"
              type="number"
              min={0}
              value={attendanceForm.toleranceMinutes}
              onChange={handleAttendanceChange}
            />
            <Input
              id="minDuration"
              name="minimumDurationMinutes"
              label="Durée min (min)"
              type="number"
              min={1}
              value={attendanceForm.minimumDurationMinutes}
              onChange={handleAttendanceChange}
            />
          </div>
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <Button type="button" onClick={saveAttendanceRules} disabled={savingRules}>
              {savingRules ? 'Enregistrement...' : 'Mettre à jour'}
            </Button>
          </div>
        </article>

        <article className="settings-card" style={{ gridColumn: 'span 2' }}>
          <span className="card__meta">Types d'absence</span>
          <h3>Liste personnalisée</h3>
          <div className="table-wrapper">
            <table className="table" aria-label="types d'absence">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Libellé</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>{absenceTypeRows}</tbody>
            </table>
          </div>
          <form className="form-row" onSubmit={submitNewType} style={{ marginTop: '1rem' }}>
            <Input
              id="newCode"
              name="code"
              label="Code"
              value={newType.code}
              onChange={(event) => setNewType((prev) => ({ ...prev, code: event.target.value }))}
            />
            <Input
              id="newName"
              name="name"
              label="Nom"
              value={newType.name}
              onChange={(event) => setNewType((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Button type="submit" disabled={creatingType}>
              {creatingType ? 'Ajout...' : 'Ajouter'}
            </Button>
          </form>
        </article>

        <article className="settings-card" style={{ gridColumn: 'span 2' }}>
          <span className="card__meta">Rôles</span>
          <h3>Permissions</h3>
          <div className="detail-grid">
            {data.roles.map((role) => (
              <div key={role.role} className="detail-grid__item">
                <span>{role.role}</span>
                <strong>{role.description}</strong>
                <ul className="list-line" style={{ border: 'none', paddingTop: '0.5rem' }}>
                  {role.permissions.map((permission) => (
                    <li key={permission} style={{ border: 'none', padding: '0.25rem 0' }}>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};
