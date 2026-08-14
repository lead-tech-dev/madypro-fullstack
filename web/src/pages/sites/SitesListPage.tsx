import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteSite, listSites, createSite, updateSite } from '../../services/api/sites.api';
import { Site } from '../../types/site';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { Modal, ModalHeader, ModalBody } from '../../components/ui/Modal';
import { useAuthContext } from '../../context/AuthContext';
import { listUsers } from '../../services/api/users.api';
import { User } from '../../types/user';
import { env } from '../../config/env';

const STATUS_OPTIONS = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
];

const EMPTY_FORM_VALUES = {
  name: '',
  address: '',
  timeWindow: '',
  active: true,
  latitude: '',
  longitude: '',
};

export const SitesListPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [formValues, setFormValues] = useState(EMPTY_FORM_VALUES);
  const mapboxToken = env.mapboxToken;
  const [addressSuggestions, setAddressSuggestions] = useState<
    { id: string; label: string; latitude?: number; longitude?: number }[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const portfolio = useMemo(() => {
    const active = sites.filter((site) => site.active).length;
    const inactive = sites.length - active;
    return [
      { label: 'Sites actifs', value: `${String(active).padStart(2, '0')}` },
      { label: 'Sites inactifs', value: `${String(inactive).padStart(2, '0')}` },
    ];
  }, [sites]);

  useEffect(() => {
    if (!token) {
      setError('Veuillez vous reconnecter pour afficher les sites.');
      return;
    }
    setLoading(true);
    Promise.all([listSites(token, { page, pageSize }), listUsers(token, { role: 'SUPERVISOR', status: 'active' })])
      .then(([sitePage, supervisorData]) => {
        const siteItems = Array.isArray((sitePage as any)?.items)
          ? (sitePage as any).items
          : Array.isArray(sitePage as any)
          ? (sitePage as any)
          : [];
        const supervisorItems = Array.isArray((supervisorData as any)?.items)
          ? (supervisorData as any).items
          : Array.isArray(supervisorData as any)
          ? (supervisorData as any)
          : [];
        setSites(siteItems);
        setTotal((sitePage as any)?.total ?? siteItems.length);
        setSupervisors(supervisorItems);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Impossible de charger les sites.';
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
    <div className="page-container sites-page" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="pill">Gestion des sites</span>
          <h2>Cartographie terrain</h2>
          <p>Centralisez les implantations à nettoyer, les responsables locaux et les fenêtres horaires.</p>
          <Button
            type="button"
            onClick={() => {
              setEditingSite(null);
              setFormValues(EMPTY_FORM_VALUES);
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
              <div>Adresse</div>
              <div>Statut</div>
              <div>Actions</div>
            </div>
            <div className="table-body">
              {sites.map((site) => (
                <div className="table-row" key={site.id}>
                  <div>{site.name}</div>
                  <div>{site.address}</div>
                  <div>
                    <span className={`tag ${site.active ? 'tag--success' : 'tag--muted'}`}>
                      {site.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="table-actions">
                    <Link to={`/supervision/sites/${site.id}`} className="btn btn--ghost btn--compact">
                      Fiche complète
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      className="btn--compact"
                    onClick={() => {
                      setEditingSite(site);
                      setFormValues({
                        name: site.name,
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

      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditingSite(null); }} maxWidth={700} labelledBy="site-quick-form-title">
        <ModalHeader
          eyebrow="Site"
          title={editingSite ? 'Modifier un site' : 'Nouveau site'}
          titleId="site-quick-form-title"
          onClose={() => { setFormOpen(false); setEditingSite(null); }}
          actions={
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFormValues(EMPTY_FORM_VALUES);
                setEditingSite(null);
              }}
            >
              Réinitialiser
            </Button>
          }
        />
        <ModalBody>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return;
                if (!formValues.name) {
                  notify('Nom requis', 'error');
                  return;
                }
                setSaving(true);
                try {
                  if (editingSite) {
                    const updated = await updateSite(token, editingSite.id, {
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
              style={{ boxShadow: 'none', padding: 0, display: 'grid', gap: '1rem' }}
            >
              <Input
                label="Nom du site"
                value={formValues.name}
                onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <div className="form-field">
                <Input
                  label="Adresse"
                  value={formValues.address}
                  onChange={(e) => setFormValues((p) => ({ ...p, address: e.target.value }))}
                  required
                  helperText={
                    mapboxToken
                      ? addressError
                        ? `Erreur Mapbox : ${addressError}`
                        : addressLoading
                        ? 'Recherche en cours…'
                        : 'Tapez 3 lettres pour rechercher une adresse'
                      : 'Ajoutez VITE_MAPBOX_TOKEN pour activer la recherche.'
                  }
                />
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
              <ChipGroup
                multiple
                label="Superviseurs"
                options={supervisors.map((sup) => ({ value: sup.id, label: sup.name }))}
                value={selectedSupervisors}
                onChange={setSelectedSupervisors}
                helperText={supervisors.length === 0 ? 'Aucun superviseur actif' : undefined}
              />
              <Input
                label="Fenêtre horaire"
                value={formValues.timeWindow}
                onChange={(e) => setFormValues((p) => ({ ...p, timeWindow: e.target.value }))}
                placeholder="06h00 – 09h00"
              />
              <Select
                label="Statut"
                options={STATUS_OPTIONS}
                value={formValues.active ? 'true' : 'false'}
                onChange={(e) => setFormValues((p) => ({ ...p, active: e.target.value === 'true' }))}
              />
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
                <Button type="submit" loading={saving}>
                  {editingSite ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </form>
        </ModalBody>
      </Modal>
    </div>
  );
};
