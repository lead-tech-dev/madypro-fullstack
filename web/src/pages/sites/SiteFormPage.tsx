import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { createSite, getSite, SitePayload, updateSite } from '../../services/api/sites.api';
import { listUsers } from '../../services/api/users.api';
import { env } from '../../config/env';

const STATUS_OPTIONS = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
];

type SupervisorOption = {
  id: string;
  name: string;
};

type AddressSuggestion = {
  id: string;
  label: string;
  longitude?: number;
  latitude?: number;
};

type FormState = {
  name: string;
  address: string;
  timeWindow: string;
  latitude: string;
  longitude: string;
  active: 'true' | 'false';
};

const INITIAL_FORM: FormState = {
  name: '',
  address: '',
  timeWindow: '',
  latitude: '',
  longitude: '',
  active: 'true',
};

export const SiteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const siteId = params.id;
  const isEdit = Boolean(siteId);
  const { token, notify } = useAuthContext();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSelected, setAddressSelected] = useState(false);
  const mapboxToken = env.mapboxToken;
  const [formVisible, setFormVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('Veuillez vous reconnecter pour gérer les sites.');
      return;
    }
    setLoading(true);
    const load = async () => {
      try {
        const [supervisorData, siteData] = await Promise.all([
          listUsers(token, { role: 'SUPERVISOR', status: 'active' }),
          siteId ? getSite(token, siteId) : Promise.resolve(null),
        ]);
        const supervisorItems = (supervisorData as any)?.items ?? (supervisorData as any) ?? [];
        const supervisorOptions: SupervisorOption[] = supervisorItems.map((user: any) => ({
          id: user.id,
          name: user.name,
        }));

        if (siteData) {
          const mergedSupervisors = [...supervisorOptions];
          siteData.supervisors.forEach((supervisor) => {
            if (!mergedSupervisors.some((option) => option.id === supervisor.id)) {
              mergedSupervisors.push({ id: supervisor.id, name: supervisor.name });
            }
          });
          setSupervisors(mergedSupervisors);
          setForm({
            name: siteData.name,
            address: siteData.address,
            timeWindow: siteData.timeWindow ?? '',
            latitude: typeof siteData.latitude === 'number' ? String(siteData.latitude) : '',
            longitude: typeof siteData.longitude === 'number' ? String(siteData.longitude) : '',
            active: siteData.active ? 'true' : 'false',
          });
          setSelectedSupervisors(siteData.supervisorIds);
          setFormVisible(true);
        } else {
          setSupervisors(supervisorOptions);
          setForm(INITIAL_FORM);
          setSelectedSupervisors([]);
          // en création, on ouvre la modale directement pour aligner avec l'édition
          setFormVisible(true);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Impossible de charger les informations superviseurs.';
        setError(message);
        notify(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, notify, siteId]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'address') {
      setAddressError(null);
      setAddressSelected(false);
    }
  };

  const toggleSupervisor = (id: string) => {
    setSelectedSupervisors((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (!mapboxToken) {
      setAddressSuggestions([]);
      setAddressError('Clé Mapbox absente : définissez VITE_MAPBOX_TOKEN dans web/.env ou .env.local');
      return;
    }
    const query = form.address.trim();
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
        const suggestions: AddressSuggestion[] = (data.features ?? []).map((feature: any) => ({
          id: feature.id,
          label: feature.place_name,
          longitude: feature.center?.[0],
          latitude: feature.center?.[1],
        }));
        setAddressSuggestions(suggestions);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return;
        const message =
          fetchError instanceof Error ? fetchError.message : 'Impossible de récupérer les suggestions.';
        setAddressError(`Erreur récupération adresses : ${message}`);
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.address, mapboxToken]);

  const handleAddressSelection = (suggestion: AddressSuggestion) => {
    setForm((prev) => ({
      ...prev,
      address: suggestion.label,
      latitude: typeof suggestion.latitude === 'number' ? String(suggestion.latitude) : prev.latitude,
      longitude:
        typeof suggestion.longitude === 'number' ? String(suggestion.longitude) : prev.longitude,
    }));
    setAddressSelected(true);
    setAddressSuggestions([]);
  };

  const isInvalid = !form.name || !form.address || !token;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isInvalid) return;
    setSubmitting(true);
    setError(null);
    const latitude = form.latitude ? Number(form.latitude) : undefined;
    const longitude = form.longitude ? Number(form.longitude) : undefined;
    const payload: SitePayload = {
      name: form.name,
      address: form.address,
      timeWindow: form.timeWindow || undefined,
      latitude: Number.isFinite(latitude ?? NaN) ? latitude : undefined,
      longitude: Number.isFinite(longitude ?? NaN) ? longitude : undefined,
      active: form.active === 'true',
      supervisorIds: selectedSupervisors,
    };

    try {
      if (isEdit && siteId) {
        await updateSite(token, siteId, payload);
        notify('Site mis à jour avec succès');
      } else {
        await createSite(token, payload);
        notify('Site enregistré avec succès');
      }
      navigate('/sites');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Échec de la ${isEdit ? 'mise à jour' : 'création'} du site.`;
      setError(message);
      notify(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setForm(INITIAL_FORM);
    setSelectedSupervisors([]);
    setAddressSelected(false);
    setFormVisible(true);
  };

  return (
    <div>
      <div className="page-header">
        <span className="pill">Sites</span>
        <h2>{isEdit ? 'Modifier un site' : 'Nouveau site'}</h2>
        <p>Ajustez les informations, superviseurs et moyens logistiques d’un site.</p>
        <Button type="button" onClick={openCreateForm}>
          {isEdit ? 'Modifier' : 'Créer un site'}
        </Button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Chargement des informations...</p>
      ) : (
        formVisible && (
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
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
                border: '1px solid #eef1f4',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <span className="pill">Site</span>
                  <h3 style={{ margin: 0, letterSpacing: '-0.01em' }}>
                    {isEdit ? 'Modifier un site' : 'Nouveau site'}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="button" variant="ghost" onClick={() => setForm(INITIAL_FORM)}>
                    Réinitialiser
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setFormVisible(false)}>
                    Fermer
                  </Button>
                </div>
              </div>

              <form
                className="form-card"
                onSubmit={handleSubmit}
                style={{ boxShadow: 'none', padding: '0.75rem', marginTop: '1rem', display: 'grid', gap: '1rem' }}
              >
                <Input
                  id="name"
                  name="name"
                  label="Nom du site"
                  placeholder="Boutique Rue du Rhône"
                  required
                  value={form.name}
                  onChange={handleChange}
                />
                <Input
                  id="address"
                  name="address"
                  label="Adresse"
                  placeholder="Rue, ville, pays"
                  required
                  value={form.address}
                  onChange={handleChange}
                  helperText={
                    mapboxToken ? addressError || (addressLoading ? 'Recherche en cours…' : undefined) : undefined
                  }
                />
                {mapboxToken && addressSuggestions.length > 0 && (
                  <div className="address-suggestions">
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => handleAddressSelection(suggestion)}
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
                {addressSelected && (form.latitude || form.longitude) && (
                  <small className="form-helper">
                    Coordonnées GPS enregistrées automatiquement (lat/lon) avec l’adresse choisie.
                  </small>
                )}
                <Input
                  id="timeWindow"
                  name="timeWindow"
                  label="Fenêtre horaire standard"
                  placeholder="06h00 – 09h00"
                  value={form.timeWindow}
                  onChange={handleChange}
                />
                {(form.latitude || form.longitude) && (
                  <div className="form-field">
                    <span>Coordonnées détectées</span>
                    <small>
                      {form.latitude && `Latitude : ${form.latitude}`}
                      {form.latitude && form.longitude ? ' · ' : ''}
                      {form.longitude && `Longitude : ${form.longitude}`}
                    </small>
                  </div>
                )}
                <Select
                  id="active"
                  name="active"
                  label="Statut"
                  options={STATUS_OPTIONS}
                  value={form.active}
                  onChange={handleChange}
                />

                <div className="form-field">
                  <span>Superviseurs associés</span>
                  <div className="chips">
                    {supervisors.length ? (
                      supervisors.map((supervisor) => (
                        <button
                          key={supervisor.id}
                          type="button"
                          className={`chip ${
                            selectedSupervisors.includes(supervisor.id) ? 'chip--selected' : ''
                          }`}
                          onClick={() => toggleSupervisor(supervisor.id)}
                        >
                          {supervisor.name}
                        </button>
                      ))
                    ) : (
                      <span className="tag tag--muted">Aucun superviseur disponible</span>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" disabled={isInvalid || submitting}>
                    {submitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate('/sites')}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      )}
    </div>
  );
}
