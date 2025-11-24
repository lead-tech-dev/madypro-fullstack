import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteSite, listSites, createSite, updateSite } from '../../services/api/sites.api';
import { Site } from '../../types/site';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { Client } from '../../types/client';
import { listClients } from '../../services/api/clients.api';
import { listUsers } from '../../services/api/users.api';
import { User } from '../../types/user';
import { env } from '../../config/env';

export const SitesListPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [formValues, setFormValues] = useState({
    name: '',
    clientId: '',
    address: '',
    timeWindow: '',
    active: true,
    latitude: '',
    longitude: '',
  });
  const mapboxToken = env.mapboxToken;
  const [addressSuggestions, setAddressSuggestions] = useState<
    { id: string; label: string; latitude?: number; longitude?: number }[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const portfolio = useMemo(() => {
    const counts = sites.reduce<Record<string, number>>((acc, site) => {
      const key = site.clientName || 'Client inconnu';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        value: `${String(count).padStart(2, '0')} site${count > 1 ? 's' : ''}`,
      }));
  }, [sites]);

  useEffect(() => {
    if (!token) {
      setError('Veuillez vous reconnecter pour afficher les sites.');
      return;
    }
    setLoading(true);
    Promise.all([
      listSites(token, { page, pageSize }),
      listClients(token),
      listUsers(token, { role: 'SUPERVISOR', status: 'active' }),
    ])
      .then(([sitePage, clientData, supervisorData]) => {
        setSites(sitePage.items);
        setTotal(sitePage.total);
        setClients(clientData);
        setSupervisors(supervisorData.items ?? (supervisorData as any));
        setError(null);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Impossible de charger les sites clients.';
        setError(message);
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [token, notify, page]);

  const handleDelete = async (site: Site) => {
    if (!token) {
      notify('Session expirée : veuillez vous reconnecter.', 'error');
      return;
    }
    const confirmed = window.confirm(`Supprimer le site « ${site.name} » ?`);
    if (!confirmed) return;
    try {
      await deleteSite(token, site.id);
      setSites((prev) => prev.filter((item) => item.id !== site.id));
      notify('Site supprimé', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.';
      setError(message);
      notify(message, 'error');
    }
  };

  useEffect(() => {
    if (!mapboxToken) {
      setAddressSuggestions([]);
      return;
    }
    const query = formValues.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAddressLoading(true);
      setAddressError(null);
      try {
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        );
        url.searchParams.set('access_token', mapboxToken);
        url.searchParams.set('autocomplete', 'true');
        url.searchParams.set('limit', '5');
        url.searchParams.set('country', 'fr');
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Adresse introuvable');
        }
        const data = await response.json();
        const suggestions = (data.features ?? []).map((feature: any) => ({
          id: feature.id,
          label: feature.place_name,
          longitude: feature.center?.[0],
          latitude: feature.center?.[1],
        }));
        setAddressSuggestions(suggestions);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Impossible de récupérer les suggestions.';
        setAddressError(message);
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formValues.address, mapboxToken]);

  return (
    <div className="page-container" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Gestion des sites & clients</span>
          <h2>Cartographie des contrats</h2>
          <p>
            Centralisez les implantations à nettoyer, les responsables locaux et les prochains
            passages terrain pour garantir la promesse propreté Madypro Clean.
          </p>
          <Button
            type="button"
            onClick={() => {
              setEditingSite(null);
              setFormValues({
                name: '',
                clientId: clients[0]?.id || '',
                address: '',
                timeWindow: '',
                active: true,
                latitude: '',
                longitude: '',
              });
              setSelectedSupervisors([]);
              setFormOpen(true);
            }}
          >
            Créer un site
          </Button>
        </div>
        <div className="page-hero__accent">
          <h3>Portefeuille</h3>
          <ul className="list-line">
            {portfolio.length === 0 && <li>Aucun site.</li>}
            {portfolio.map((item) => (
              <li key={item.label}>
                {item.label} <span>{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
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
      {loading ? (
        <p>Chargement des sites...</p>
      ) : (
        <div className="card">
          <div className="table">
            <div className="table-head">
              <div>Nom</div>
              <div>Client</div>
              <div>Adresse</div>
              <div>Statut</div>
              <div>Actions</div>
            </div>
            <div className="table-body">
              {sites.map((site) => (
                <div className="table-row" key={site.id}>
                  <div>{site.name}</div>
                  <div>{site.clientName}</div>
                  <div>{site.address}</div>
                  <div>
                    <span className={`tag ${site.active ? 'tag--success' : 'tag--muted'}`}>
                      {site.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="table-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      className="btn--compact"
                      onClick={() => {
                        setEditingSite(site);
                        setFormValues({
                          name: site.name,
                          clientId: site.clientId,
                          address: site.address,
                          timeWindow: site.timeWindow ?? '',
                          active: site.active,
                          latitude: site.latitude != null ? String(site.latitude) : '',
                          longitude: site.longitude != null ? String(site.longitude) : '',
                        });
                        setSelectedSupervisors(site.supervisors?.map((s) => s.id) ?? []);
                        setFormOpen(true);
                      }}
                    >
                      Éditer
                    </Button>
                    <Button
                      className="btn--ghost btn--compact"
                      onClick={() => handleDelete(site)}
                      type="button"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
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
              padding: '2rem',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              border: '1px solid #eef1f4',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="pill">Site</span>
                <h3 style={{ margin: '0.25rem 0 0 0' }}>
                  {editingSite ? 'Modifier un site' : 'Nouveau site'}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFormValues({
                      name: '',
                      clientId: clients[0]?.id || '',
                      address: '',
                      timeWindow: '',
                      active: true,
                      latitude: '',
                      longitude: '',
                    });
                    setEditingSite(null);
                  }}
                  className="btn--compact"
                >
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingSite(null);
                  }}
                  className="btn--compact"
                >
                  Fermer
                </Button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return;
                if (!formValues.name || !formValues.clientId) {
                  notify('Nom et client requis', 'error');
                  return;
                }
                setSaving(true);
                try {
                  if (editingSite) {
                    const updated = await updateSite(token, editingSite.id, {
                      clientId: formValues.clientId || editingSite.clientId,
                      name: formValues.name,
                      address: formValues.address,
                      timeWindow: formValues.timeWindow || undefined,
                      active: formValues.active,
                      latitude:
                        formValues.latitude && Number.isFinite(Number(formValues.latitude))
                          ? Number(formValues.latitude)
                          : undefined,
                      longitude:
                        formValues.longitude && Number.isFinite(Number(formValues.longitude))
                          ? Number(formValues.longitude)
                          : undefined,
                      supervisorIds: selectedSupervisors,
                    });
                    setSites((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
                    notify('Site mis à jour');
                  } else {
                    const created = await createSite(token, {
                      clientId: formValues.clientId || clients[0]?.id || '',
                      name: formValues.name,
                      address: formValues.address,
                      timeWindow: formValues.timeWindow || undefined,
                      active: formValues.active,
                      latitude:
                        formValues.latitude && Number.isFinite(Number(formValues.latitude))
                          ? Number(formValues.latitude)
                          : undefined,
                      longitude:
                        formValues.longitude && Number.isFinite(Number(formValues.longitude))
                          ? Number(formValues.longitude)
                          : undefined,
                      supervisorIds: selectedSupervisors,
                    });
                    setSites((prev) => [created, ...prev]);
                    notify('Site créé');
                  }
                  setFormOpen(false);
                  setEditingSite(null);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
                  notify(message, 'error');
                } finally {
                  setSaving(false);
                }
              }}
              className="form-card"
              style={{ boxShadow: 'none', padding: '0.75rem', display: 'grid', gap: '1rem' }}
            >
              <div className="form-field">
                <label className="form-label">Nom du site</label>
                <input
                  className="form-control"
                  value={formValues.name}
                  onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Client</label>
                <select
                  className="form-control"
                  value={formValues.clientId}
                  onChange={(e) => setFormValues((p) => ({ ...p, clientId: e.target.value }))}
                  required
                >
                  {clients.length === 0 && <option value="">Aucun client</option>}
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Client fixe en arrière-plan pour compatibilité API */}
              <div className="form-field">
                <label className="form-label">Adresse</label>
                <input
                  className="form-control"
                  value={formValues.address}
                  onChange={(e) => setFormValues((p) => ({ ...p, address: e.target.value }))}
                  required
                />
                {mapboxToken ? (
                  <small className="form-helper">
                    {addressError
                      ? `Erreur Mapbox : ${addressError}`
                      : addressLoading
                      ? 'Recherche en cours…'
                      : 'Tapez 3 lettres pour rechercher une adresse'}
                  </small>
                ) : (
                  <small className="form-helper">Ajoutez VITE_MAPBOX_TOKEN pour activer la recherche.</small>
                )}
                {mapboxToken && addressSuggestions.length > 0 && (
                  <div className="address-suggestions">
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setFormValues((prev) => ({
                            ...prev,
                            address: suggestion.label,
                            latitude:
                              typeof suggestion.latitude === 'number'
                                ? String(suggestion.latitude)
                                : prev.latitude,
                            longitude:
                              typeof suggestion.longitude === 'number'
                                ? String(suggestion.longitude)
                                : prev.longitude,
                          }));
                          setAddressSuggestions([]);
                        }}
                      >
                        <strong>{suggestion.label}</strong>
                        {(suggestion.latitude !== undefined || suggestion.longitude !== undefined) && (
                          <span>
                            {suggestion.latitude !== undefined && `Lat ${suggestion.latitude.toFixed(4)}`}
                            {suggestion.latitude !== undefined && suggestion.longitude !== undefined && ' · '}
                            {suggestion.longitude !== undefined && `Lon ${suggestion.longitude.toFixed(4)}`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-field">
                <label className="form-label">Superviseurs</label>
                <div className="chips">
                  {supervisors.length ? (
                    supervisors.map((sup) => (
                      <button
                        key={sup.id}
                        type="button"
                        className={`chip ${
                          selectedSupervisors.includes(sup.id) ? 'chip--selected' : ''
                        }`}
                        onClick={() =>
                          setSelectedSupervisors((prev) =>
                            prev.includes(sup.id)
                              ? prev.filter((id) => id !== sup.id)
                              : [...prev, sup.id],
                          )
                        }
                      >
                        {sup.name}
                      </button>
                    ))
                  ) : (
                    <span className="tag tag--muted">Aucun superviseur actif</span>
                  )}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Fenêtre horaire</label>
                <input
                  className="form-control"
                  value={formValues.timeWindow}
                  onChange={(e) => setFormValues((p) => ({ ...p, timeWindow: e.target.value }))}
                  placeholder="06h00 – 09h00"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Statut</label>
                <select
                  className="form-control"
                  value={formValues.active ? 'true' : 'false'}
                  onChange={(e) => setFormValues((p) => ({ ...p, active: e.target.value === 'true' }))}
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
              {(formValues.latitude || formValues.longitude) && (
                <div className="form-field">
                  <label className="form-label">Coordonnées détectées</label>
                  <small className="form-helper">
                    {formValues.latitude && `Lat : ${formValues.latitude}`}
                    {formValues.latitude && formValues.longitude ? ' · ' : ''}
                    {formValues.longitude && `Lon : ${formValues.longitude}`}
                  </small>
                </div>
              )}
              <div className="form-actions">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Enregistrement...' : editingSite ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
