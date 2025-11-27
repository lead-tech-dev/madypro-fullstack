import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listUsers,
  updateUserStatus,
  resetUserPassword,
  createUser,
} from '../../services/api/users.api';
import { User } from '../../types/user';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { listAttendance } from '../../services/api/attendance.api';
import { Attendance } from '../../types/attendance';

export const UsersListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: '', role: 'all', status: 'all' });
  const [formVisible, setFormVisible] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'AGENT',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [liveNotes, setLiveNotes] = useState<Array<{ id: string; text: string }>>([]);
  const { token, notify } = useAuthContext();

  useEffect(() => {
    if (!token) {
      return;
    }
    listUsers(token, {
      search: filters.search,
      role: filters.role !== 'all' ? filters.role : undefined,
      status: filters.status !== 'all' ? (filters.status as 'active' | 'inactive') : undefined,
      page,
      pageSize,
    })
      .then((data) => {
        setUsers(data.items);
        setTotal(data.total);
        setError(null);
        notify('Utilisateurs chargés', 'success');
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les utilisateurs';
        setError(message);
        setUsers([]);
        notify(message, 'error');
      });
  }, [token, filters, page]);

  useEffect(() => {
    if (!token) return;
    const today = new Date().toISOString().slice(0, 10);
    listAttendance(token, { startDate: today, endDate: today, status: 'all', page: 1, pageSize: 50 })
      .then((data) => {
        const items = (data as any)?.items ?? (data as any as Attendance[]);
        const notes = items
          .sort((a: Attendance, b: Attendance) => (b.checkInTime || '').localeCompare(a.checkInTime || ''))
          .slice(0, 5)
          .map((att: Attendance) => {
            const status =
              att.status === 'CANCELLED'
                ? 'Annulé'
                : att.checkOutTime
                ? `Sortie ${att.checkOutTime}`
                : att.checkInTime
                ? `Entrée ${att.checkInTime}`
                : 'En attente';
            return {
              id: att.id,
              text: `${att.agent.name} · ${att.site.name} · ${status}`,
            };
          });
        setLiveNotes(notes);
      })
      .catch(() => setLiveNotes([]));
  }, [token]);

  const handleStatusToggle = async (user: User) => {
    if (!token) return;
    try {
      const updated = await updateUserStatus(token, user.id, !user.active);
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
      notify(!user.active ? 'Utilisateur activé' : 'Utilisateur désactivé', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de mettre à jour l'utilisateur";
      setError(message);
      notify(message, 'error');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!token) return;
    try {
      const result = await resetUserPassword(token, user.id);
      notify(`Nouveau mot de passe pour ${user.firstName} ${user.lastName} : ${result.password}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de réinitialiser le mot de passe';
      setError(message);
      notify(message, 'error');
    }
  };

  const handleCreateChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setCreating(true);
    try {
      const newUser = await createUser(token, createForm);
      setUsers((prev) => [newUser, ...prev]);
      notify('Utilisateur créé', 'success');
      setCreateForm({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT', password: '' });
      setFormVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de créer le compte';
      notify(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'AGENT',
      password: '',
    });
    setFormVisible(true);
  };

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Coordination Madypro Clean</span>
          <h2>Vos talents propreté</h2>
          <p>
            Chaque fiche valorise les responsables de sites et agents de nettoyage : zones
            d’intervention, statuts en temps réel et contacts directs.
          </p>
          <Button type="button" onClick={openCreateModal}>
            Créer un utilisateur
          </Button>
        </div>
        <div className="page-hero__accent">
          <h3>Notes live</h3>
          <ul className="list-line">
            {liveNotes.length === 0 && <li>Aucun pointage aujourd’hui.</li>}
            {liveNotes.map((note) => (
              <li key={note.id}>{note.text}</li>
            ))}
          </ul>
        </div>
      </div>

      {formVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 20%, rgba(68,174,248,0.08), transparent 25%), rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              border: '1px solid #eef1f4',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="pill">Utilisateur</span>
                <h3 style={{ margin: 0 }}>Nouvel utilisateur</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCreateForm({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT', password: '' })
                  }
                >
                  Réinitialiser
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormVisible(false)}>
                  Fermer
                </Button>
              </div>
            </div>

            <form
              className="form-card"
              onSubmit={handleCreateSubmit}
              style={{ boxShadow: 'none', padding: '0.75rem', marginTop: '1rem', display: 'grid', gap: '1rem' }}
            >
              <Input
                name="firstName"
                label="Prénom"
                value={createForm.firstName}
                onChange={handleCreateChange}
                required
              />
              <Input
                name="lastName"
                label="Nom"
                value={createForm.lastName}
                onChange={handleCreateChange}
                required
              />
              <Input
                type="email"
                name="email"
                label="Email"
                value={createForm.email}
                onChange={handleCreateChange}
                required
              />
              <Input name="phone" label="Téléphone" value={createForm.phone} onChange={handleCreateChange} />
              <Select
                name="role"
                label="Rôle"
                value={createForm.role}
                onChange={handleCreateChange}
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'SUPERVISOR', label: 'Superviseur' },
                  { value: 'AGENT', label: 'Agent' },
                ]}
              />
              <Input
                type="password"
                name="password"
                label="Mot de passe"
                value={createForm.password}
                onChange={handleCreateChange}
                required
              />
              <div className="form-actions">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormVisible(false)} style={{ marginLeft: '0.5rem' }}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="filter-grid" role="search">
        <label className="filter-field filter-card filter-card--wide">
          Recherche
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Nom ou email"
          />
        </label>
        <label className="filter-field filter-card">
          Rôle
          <select
            value={filters.role}
            onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="all">Tous</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERVISOR">Superviseur</option>
            <option value="AGENT">Agent</option>
          </select>
        </label>
        <label className="filter-field filter-card">
          Statut
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="page-grid">
        {Array.isArray(users) &&
          users.map((employee) => (
            <article key={employee.id} className="card">
              <span className="card__meta">{employee.role}</span>
              <h3>{employee.firstName} {employee.lastName}</h3>
            <p>
              <span
                className={`status-chip ${
                  employee.active ? 'status-chip--success' : 'status-chip--warning'
                }`}
              >
                {employee.active ? 'Actif' : 'Inactif'}
              </span>
            </p>
            <p>Tél : {employee.phone}</p>
            <p>Email : {employee.email}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to={`/users/${employee.id}/edit`} className="btn btn--ghost">
                Modifier
              </Link>
              <Button type="button" variant="ghost" onClick={() => handleStatusToggle(employee)}>
                {employee.active ? 'Désactiver' : 'Activer'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleResetPassword(employee)}>
                Réinitialiser
              </Button>
            </div>
          </article>
          ))}
      </div>

      <div className="pagination" style={{ marginTop: '1.5rem' }}>
        <Button type="button" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Précédent
        </Button>
        <span className="card__meta">Page {page}</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const maxPage = Math.ceil(total / pageSize) || 1;
            setPage((p) => (p < maxPage ? p + 1 : p));
          }}
          disabled={page * pageSize >= total}
        >
          Suivant
        </Button>
        <span className="card__meta">{total} résultats</span>
      </div>
    </div>
  );
};
