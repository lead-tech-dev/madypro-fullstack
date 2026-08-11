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
    </div>
  );
};
