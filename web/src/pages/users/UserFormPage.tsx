import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  createUser,
  getUser,
  updateUser,
  updateUserPermissions,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../services/api/users.api';
import {
  listCertifications,
  createCertification,
  deleteCertification,
  listEmployeeDocuments,
  createEmployeeDocument,
  deleteEmployeeDocument,
} from '../../services/api/team.api';
import { Certification, EmployeeDocument } from '../../types/team';
import { useAuthContext } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Superviseur' },
  { value: 'AGENT', label: 'Agent' },
];

const PERMISSION_OPTIONS = [
  { value: 'settings:manage', label: 'Gérer les paramètres' },
  { value: 'users:manage', label: 'Gérer les utilisateurs' },
  { value: 'reports:export', label: 'Exporter les rapports' },
  { value: 'webhooks:manage', label: 'Gérer les webhooks' },
];

const DEFAULT_FORM: CreateUserPayload = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'AGENT',
  password: '',
};

export const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token, notify } = useAuthContext();
  const [form, setForm] = useState<CreateUserPayload>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [newCert, setNewCert] = useState({ label: '', expiresAt: '' });
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [newDoc, setNewDoc] = useState({ type: 'CONTRACT', label: '', file: null as File | null });

  const loadTeamExtras = React.useCallback(() => {
    if (!token || !id) return;
    listCertifications(token, id).then(setCertifications).catch(() => {});
    listEmployeeDocuments(token, id).then(setDocuments).catch(() => {});
  }, [token, id]);

  useEffect(loadTeamExtras, [loadTeamExtras]);

  const submitCertification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !id || !newCert.label.trim()) return;
    try {
      await createCertification(token, {
        userId: id,
        label: newCert.label.trim(),
        expiresAt: newCert.expiresAt || undefined,
      });
      setNewCert({ label: '', expiresAt: '' });
      loadTeamExtras();
      notify('Habilitation ajoutée', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’ajouter', 'error');
    }
  };

  const removeCertification = async (certId: string) => {
    if (!token) return;
    await deleteCertification(token, certId).catch(() => {});
    loadTeamExtras();
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const submitDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !id || !newDoc.file || !newDoc.label.trim()) return;
    try {
      const fileUrl = await readFileAsBase64(newDoc.file);
      await createEmployeeDocument(token, { userId: id, type: newDoc.type, label: newDoc.label.trim(), fileUrl });
      setNewDoc({ type: 'CONTRACT', label: '', file: null });
      loadTeamExtras();
      notify('Document ajouté', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’ajouter', 'error');
    }
  };

  const removeDocument = async (docId: string) => {
    if (!token) return;
    await deleteEmployeeDocument(token, docId).catch(() => {});
    loadTeamExtras();
  };

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    getUser(token, id)
      .then((user) => {
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role.toUpperCase(),
          password: '',
        });
        setPermissions(user.permissions ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Utilisateur introuvable'))
      .finally(() => setLoading(false));
  }, [token, id]);

  const togglePermission = (value: string) => {
    setPermissions((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  const savePermissions = async () => {
    if (!token || !id) return;
    setSavingPermissions(true);
    try {
      await updateUserPermissions(token, id, permissions);
      notify('Permissions mises à jour', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de mettre à jour les permissions';
      notify(message, 'error');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleChange = (field: keyof CreateUserPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        const payload: UpdateUserPayload = { ...form };
        if (!payload.password) delete payload.password;
        await updateUser(token, id, payload);
        notify('Utilisateur mis à jour', 'success');
      } else {
        await createUser(token, form);
        notify('Utilisateur créé', 'success');
      }
      navigate('/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de sauvegarder';
      setError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="pill">Équipes</span>
        <h2>{isEdit ? 'Modifier un utilisateur' : 'Créer un utilisateur'}</h2>
        <p>Gérez les accès et coordonnées des collaborateurs Madypro Clean.</p>
      </div>
      {error && <p className="form-error">{error}</p>}
      <form className="form-card" onSubmit={handleSubmit}>
        <Input
          label="Prénom"
          value={form.firstName}
          onChange={(event) => handleChange('firstName', event.target.value)}
          required
        />
        <Input
          label="Nom"
          value={form.lastName}
          onChange={(event) => handleChange('lastName', event.target.value)}
          required
        />
        <Input
          type="email"
          label="Email"
          value={form.email}
          onChange={(event) => handleChange('email', event.target.value)}
          required
        />
        <Input
          label="Téléphone"
          value={form.phone}
          onChange={(event) => handleChange('phone', event.target.value)}
        />
        <Select
          label="Rôle"
          value={form.role}
          onChange={(event) => handleChange('role', event.target.value)}
          options={ROLE_OPTIONS}
        />
        <Input
          type="password"
          label={isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
          value={form.password}
          onChange={(event) => handleChange('password', event.target.value)}
          required={!isEdit}
          placeholder={isEdit ? 'Laisser vide pour conserver l’actuel' : 'Au moins 6 caractères'}
        />
        <div className="form-actions">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/users')}>
            Annuler
          </Button>
        </div>
      </form>

      {isEdit && form.role !== 'ADMIN' && (
        <article className="settings-card" style={{ marginTop: '1.5rem' }}>
          <span className="card__meta">Accès</span>
          <h3>Permissions granulaires</h3>
          <p className="card__meta">
            Accorde des droits spécifiques au-delà du rôle {form.role === 'SUPERVISOR' ? 'Superviseur' : 'Agent'}.
          </p>
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            {PERMISSION_OPTIONS.map((option) => (
              <label key={option.value} className="settings-toggle" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={permissions.includes(option.value)}
                  onChange={() => togglePermission(option.value)}
                />
                <span style={{ textTransform: 'none' }}>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <Button type="button" onClick={savePermissions} disabled={savingPermissions}>
              {savingPermissions ? 'Enregistrement...' : 'Enregistrer les permissions'}
            </Button>
          </div>
        </article>
      )}

      {isEdit && (
        <article className="settings-card" style={{ marginTop: '1.5rem' }}>
          <span className="card__meta">RH</span>
          <h3>Habilitations</h3>
          <div className="table-wrapper">
            <table className="table" aria-label="habilitations">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Expiration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert) => {
                  const expiringSoon =
                    cert.expiresAt && new Date(cert.expiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={cert.id}>
                      <td>{cert.label}</td>
                      <td style={expiringSoon ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                        {cert.expiresAt ? cert.expiresAt.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <Button type="button" variant="ghost" onClick={() => removeCertification(cert.id)}>
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <form className="form-row" onSubmit={submitCertification} style={{ marginTop: '1rem' }}>
            <Input
              label="Libellé"
              value={newCert.label}
              onChange={(event) => setNewCert((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Habilitation électrique"
            />
            <Input
              type="date"
              label="Expiration"
              value={newCert.expiresAt}
              onChange={(event) => setNewCert((prev) => ({ ...prev, expiresAt: event.target.value }))}
            />
            <Button type="submit">Ajouter</Button>
          </form>
        </article>
      )}

      {isEdit && (
        <article className="settings-card" style={{ marginTop: '1.5rem' }}>
          <span className="card__meta">RH</span>
          <h3>Documents</h3>
          <div className="table-wrapper">
            <table className="table" aria-label="documents">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Libellé</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.type}</td>
                    <td>{doc.label}</td>
                    <td>
                      <Button type="button" variant="ghost" onClick={() => removeDocument(doc.id)}>
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="form-row" onSubmit={submitDocument} style={{ marginTop: '1rem' }}>
            <Select
              label="Type"
              value={newDoc.type}
              onChange={(event) => setNewDoc((prev) => ({ ...prev, type: event.target.value }))}
              options={[
                { value: 'CONTRACT', label: 'Contrat' },
                { value: 'BADGE', label: 'Badge' },
                { value: 'LICENSE', label: 'Permis' },
                { value: 'OTHER', label: 'Autre' },
              ]}
            />
            <Input
              label="Libellé"
              value={newDoc.label}
              onChange={(event) => setNewDoc((prev) => ({ ...prev, label: event.target.value }))}
            />
            <label className="form-field">
              <span>Fichier</span>
              <input
                type="file"
                onChange={(event) => setNewDoc((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
              />
            </label>
            <Button type="submit">Ajouter</Button>
          </form>
        </article>
      )}
    </div>
  );
};
