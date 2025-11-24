import React, { useEffect, useState } from 'react';
import { listClientsPage, createClient, updateClient, deleteClient } from '../../services/api/clients.api';
import { Client } from '../../types/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthContext } from '../../context/AuthContext';

const emptyForm = { name: '', contactName: '', contactEmail: '', contactPhone: '' };

export const ClientsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listClientsPage(token, { page, pageSize })
      .then((res) => {
        setClients(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les clients'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name ?? '',
      contactName: client.contact?.name ?? '',
      contactEmail: client.contact?.email ?? '',
      contactPhone: client.contact?.phone ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      if (editing) {
        await updateClient(token, editing.id, form);
        notify('Client mis à jour', 'success');
      } else {
        await createClient(token, form);
        notify('Client créé', 'success');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!token) return;
    const confirm = window.confirm(`Supprimer le client « ${client.name} » ?`);
    if (!confirm) return;
    try {
      await deleteClient(token, client.id);
      notify('Client supprimé', 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Suppression impossible', 'error');
    }
  };

  return (
    <div className="page-container clients-page" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Portefeuille clients</span>
          <h2>Gestion des clients</h2>
          <p>Ajoutez, modifiez ou supprimez les clients pour vos sites et interventions.</p>
          <Button type="button" onClick={openCreate}>
            Créer un client
          </Button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Chargement des clients...</p>
      ) : (
        <div className="card">
          <div className="table">
            <div className="table-head">
              <div>Nom</div>
              <div>Contact</div>
              <div>Email</div>
              <div>Téléphone</div>
              <div>Actions</div>
            </div>
            <div className="table-body">
              {clients.map((client) => (
                <div className="table-row" key={client.id}>
                  <div>{client.name}</div>
                  <div>{client.contact?.name || '—'}</div>
                  <div>{client.contact?.email || '—'}</div>
                  <div>{client.contact?.phone || '—'}</div>
                  <div className="table-actions">
                    <Button type="button" variant="ghost" className="btn--compact" onClick={() => openEdit(client)}>
                      Éditer
                    </Button>
                    <Button type="button" variant="ghost" className="btn--compact" onClick={() => handleDelete(client)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
              {clients.length === 0 && <div className="table-row">Aucun client.</div>}
            </div>
          </div>
          <div className="pagination">
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
      )}

      {formOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="pill">Client</span>
                <h3>{editing ? 'Modifier un client' : 'Nouveau client'}</h3>
              </div>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Fermer
              </Button>
            </div>
            <form className="form-card" onSubmit={handleSubmit}>
              <Input
                name="name"
                label="Nom"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <Input
                name="contactName"
                label="Contact"
                value={form.contactName}
                onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
              />
              <Input
                name="contactEmail"
                label="Email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              />
              <Input
                name="contactPhone"
                label="Téléphone"
                value={form.contactPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              />
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
