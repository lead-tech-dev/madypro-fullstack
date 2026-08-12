import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import {
  createSite,
  createSiteChecklistItem,
  deleteSiteChecklistItem,
  getSite,
  listSiteChecklist,
  SitePayload,
  updateSite,
  listSiteContracts,
  createSiteContract,
  deleteSiteContract,
  listSiteZones,
  createSiteZone,
  updateSiteZone,
  deleteSiteZone,
  setSitePlanImage,
  getSiteIncidents,
  getSiteQualityScore,
  getSiteQrCode,
} from '../../services/api/sites.api';
import { listInventory, createInventoryItem, adjustInventoryItem, deleteInventoryItem } from '../../services/api/inventory.api';
import { SiteChecklistItem } from '../../types/site';
import { SiteContract, SiteZone, SiteIncident, SiteQualityScore, SiteQrCode } from '../../types/siteAdvanced';
import { InventoryItem } from '../../types/inventory';
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
  accessInstructions: string;
  accessCode: string;
  contactName: string;
  contactPhone: string;
  gpsDistanceMeters: string;
  toleranceMinutes: string;
  minimumDurationMinutes: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  address: '',
  timeWindow: '',
  latitude: '',
  longitude: '',
  active: 'true',
  accessInstructions: '',
  accessCode: '',
  contactName: '',
  contactPhone: '',
  gpsDistanceMeters: '',
  toleranceMinutes: '',
  minimumDurationMinutes: '',
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
  const [checklist, setChecklist] = useState<SiteChecklistItem[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [contracts, setContracts] = useState<SiteContract[]>([]);
  const [newContract, setNewContract] = useState({ label: '', startDate: '', endDate: '', slaDetails: '' });
  const [zones, setZones] = useState<SiteZone[]>([]);
  const [newZone, setNewZone] = useState({ label: '', floor: '' });
  const [planImageUrl, setPlanImageUrl] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<SiteIncident[]>([]);
  const [qualityScore, setQualityScore] = useState<SiteQualityScore | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newInventoryItem, setNewInventoryItem] = useState({ name: '', barcode: '', unit: '', quantity: '0', minThreshold: '0' });
  const [qrCode, setQrCode] = useState<SiteQrCode | null>(null);

  const loadSiteExtras = (currentSiteId: string) => {
    if (!token) return;
    listSiteContracts(token, currentSiteId).then(setContracts).catch(() => {});
    listSiteZones(token, currentSiteId).then(setZones).catch(() => {});
    getSiteIncidents(token, currentSiteId).then(setIncidents).catch(() => {});
    getSiteQualityScore(token, currentSiteId).then(setQualityScore).catch(() => {});
    listInventory(token, currentSiteId).then(setInventory).catch(() => {});
    getSiteQrCode(token, currentSiteId).then(setQrCode).catch(() => {});
  };

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
            accessInstructions: siteData.accessInstructions ?? '',
            accessCode: siteData.accessCode ?? '',
            contactName: siteData.contactName ?? '',
            contactPhone: siteData.contactPhone ?? '',
            gpsDistanceMeters:
              typeof siteData.gpsDistanceMeters === 'number' ? String(siteData.gpsDistanceMeters) : '',
            toleranceMinutes:
              typeof siteData.toleranceMinutes === 'number' ? String(siteData.toleranceMinutes) : '',
            minimumDurationMinutes:
              typeof siteData.minimumDurationMinutes === 'number' ? String(siteData.minimumDurationMinutes) : '',
          });
          setSelectedSupervisors(siteData.supervisorIds);
          setPlanImageUrl((siteData as any).planImageUrl ?? null);
          setFormVisible(true);
          listSiteChecklist(token, siteData.id)
            .then(setChecklist)
            .catch(() => setChecklist([]));
          loadSiteExtras(siteData.id);
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
      accessInstructions: form.accessInstructions || undefined,
      accessCode: form.accessCode || undefined,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      gpsDistanceMeters: form.gpsDistanceMeters ? Number(form.gpsDistanceMeters) : undefined,
      toleranceMinutes: form.toleranceMinutes ? Number(form.toleranceMinutes) : undefined,
      minimumDurationMinutes: form.minimumDurationMinutes ? Number(form.minimumDurationMinutes) : undefined,
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

  const handleAddChecklistItem = async () => {
    if (!token || !siteId || !newChecklistLabel.trim()) return;
    setChecklistBusy(true);
    try {
      const item = await createSiteChecklistItem(token, siteId, {
        label: newChecklistLabel.trim(),
        order: checklist.length,
      });
      setChecklist((prev) => [...prev, item]);
      setNewChecklistLabel('');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible d'ajouter cet élément.", 'error');
    } finally {
      setChecklistBusy(false);
    }
  };

  const handleRemoveChecklistItem = async (itemId: string) => {
    if (!token || !siteId) return;
    try {
      await deleteSiteChecklistItem(token, siteId, itemId);
      setChecklist((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de supprimer cet élément.', 'error');
    }
  };

  const submitContract = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !siteId || !newContract.label.trim() || !newContract.startDate || !newContract.endDate) return;
    try {
      await createSiteContract(token, siteId, {
        label: newContract.label.trim(),
        startDate: newContract.startDate,
        endDate: newContract.endDate,
        slaDetails: newContract.slaDetails || undefined,
      });
      setNewContract({ label: '', startDate: '', endDate: '', slaDetails: '' });
      loadSiteExtras(siteId);
      notify('Contrat ajouté');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’ajouter', 'error');
    }
  };

  const removeContract = async (contractId: string) => {
    if (!token || !siteId) return;
    await deleteSiteContract(token, siteId, contractId).catch(() => {});
    loadSiteExtras(siteId);
  };

  const submitZone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !siteId || !newZone.label.trim()) return;
    try {
      await createSiteZone(token, siteId, { label: newZone.label.trim(), floor: newZone.floor || undefined });
      setNewZone({ label: '', floor: '' });
      loadSiteExtras(siteId);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’ajouter', 'error');
    }
  };

  const toggleZoneCompleted = async (zone: SiteZone) => {
    if (!token || !siteId) return;
    await updateSiteZone(token, siteId, zone.id, { completed: !zone.completed }).catch(() => {});
    loadSiteExtras(siteId);
  };

  const removeZone = async (zoneId: string) => {
    if (!token || !siteId) return;
    await deleteSiteZone(token, siteId, zoneId).catch(() => {});
    loadSiteExtras(siteId);
  };

  const handlePlanUpload = async (file: File) => {
    if (!token || !siteId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await setSitePlanImage(token, siteId, dataUrl);
        setPlanImageUrl(dataUrl);
        notify('Plan mis à jour');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Envoi impossible', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const submitInventoryItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !siteId || !newInventoryItem.name.trim()) return;
    try {
      await createInventoryItem(token, {
        siteId,
        name: newInventoryItem.name.trim(),
        barcode: newInventoryItem.barcode || undefined,
        unit: newInventoryItem.unit || undefined,
        quantity: Number(newInventoryItem.quantity) || 0,
        minThreshold: Number(newInventoryItem.minThreshold) || 0,
      });
      setNewInventoryItem({ name: '', barcode: '', unit: '', quantity: '0', minThreshold: '0' });
      loadSiteExtras(siteId);
      notify('Article ajouté');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible d’ajouter', 'error');
    }
  };

  const adjustInventory = async (itemId: string, delta: number) => {
    if (!token || !siteId) return;
    await adjustInventoryItem(token, itemId, delta).catch(() => {});
    loadSiteExtras(siteId);
  };

  const removeInventoryItem = async (itemId: string) => {
    if (!token || !siteId) return;
    await deleteInventoryItem(token, itemId).catch(() => {});
    loadSiteExtras(siteId);
  };

  const printQrCode = () => {
    if (!qrCode) return;
    const win = window.open('', '_blank', 'width=420,height=520');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR code — ${form.name}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
          <h3>${form.name}</h3>
          <img src="${qrCode.qrCodeDataUrl}" alt="QR code de pointage" style="width:280px;height:280px;" />
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
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

                <Input
                  id="accessInstructions"
                  name="accessInstructions"
                  label="Instructions d'accès"
                  placeholder="Entrée par le parking sous-sol, badge requis…"
                  value={form.accessInstructions}
                  onChange={handleChange}
                />
                <Input
                  id="accessCode"
                  name="accessCode"
                  label="Code d'accès"
                  placeholder="4821B"
                  value={form.accessCode}
                  onChange={handleChange}
                />
                <Input
                  id="contactName"
                  name="contactName"
                  label="Contact sur place"
                  placeholder="Nom du contact"
                  value={form.contactName}
                  onChange={handleChange}
                />
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  label="Téléphone du contact"
                  placeholder="+33 6 00 00 00 00"
                  value={form.contactPhone}
                  onChange={handleChange}
                />

                <div className="form-field">
                  <span>Règles de pointage — surcharge pour ce site (facultatif, sinon réglage global)</span>
                </div>
                <Input
                  id="gpsDistanceMeters"
                  name="gpsDistanceMeters"
                  label="Rayon GPS toléré (mètres)"
                  type="number"
                  placeholder="ex. 100"
                  value={form.gpsDistanceMeters}
                  onChange={handleChange}
                />
                <Input
                  id="toleranceMinutes"
                  name="toleranceMinutes"
                  label="Tolérance de retard (minutes)"
                  type="number"
                  placeholder="ex. 10"
                  value={form.toleranceMinutes}
                  onChange={handleChange}
                />
                <Input
                  id="minimumDurationMinutes"
                  name="minimumDurationMinutes"
                  label="Durée minimale de pointage (minutes)"
                  type="number"
                  placeholder="ex. 15"
                  value={form.minimumDurationMinutes}
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

                {isEdit && siteId && (
                  <div className="form-field">
                    <span>Cahier des charges (checklist du site)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {checklist.length === 0 && (
                        <small className="form-helper">Aucune tâche définie pour ce site.</small>
                      )}
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
                        >
                          <span>• {item.label}</span>
                          <Button type="button" variant="ghost" onClick={() => handleRemoveChecklistItem(item.id)}>
                            Retirer
                          </Button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Input
                          id="newChecklistLabel"
                          name="newChecklistLabel"
                          label=""
                          placeholder="Ex. Aspirer les tapis d'entrée"
                          value={newChecklistLabel}
                          onChange={(event) => setNewChecklistLabel(event.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleAddChecklistItem}
                          disabled={checklistBusy || !newChecklistLabel.trim()}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isEdit && siteId && (
                  <div className="form-field">
                    <span>Contrats / SLA</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {contracts.length === 0 && <small className="form-helper">Aucun contrat enregistré.</small>}
                      {contracts.map((contract) => {
                        const expiringSoon = new Date(contract.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                        return (
                          <div key={contract.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={expiringSoon ? { color: '#dc2626' } : undefined}>
                              {contract.label} · {contract.startDate.slice(0, 10)} → {contract.endDate.slice(0, 10)}
                            </span>
                            <Button type="button" variant="ghost" onClick={() => removeContract(contract.id)}>
                              Retirer
                            </Button>
                          </div>
                        );
                      })}
                      <div className="form-row">
                        <Input
                          label="Libellé"
                          value={newContract.label}
                          onChange={(event) => setNewContract((prev) => ({ ...prev, label: event.target.value }))}
                        />
                        <Input
                          type="date"
                          label="Début"
                          value={newContract.startDate}
                          onChange={(event) => setNewContract((prev) => ({ ...prev, startDate: event.target.value }))}
                        />
                        <Input
                          type="date"
                          label="Fin"
                          value={newContract.endDate}
                          onChange={(event) => setNewContract((prev) => ({ ...prev, endDate: event.target.value }))}
                        />
                        <Button type="button" onClick={submitContract}>
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isEdit && siteId && (
                  <div className="form-field">
                    <span>Zones & plan des locaux</span>
                    {planImageUrl && (
                      <img src={planImageUrl} alt="Plan des locaux" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '0.5rem' }} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handlePlanUpload(file);
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {zones.length === 0 && <small className="form-helper">Aucune zone définie.</small>}
                      {zones.map((zone) => (
                        <div key={zone.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" checked={zone.completed} onChange={() => toggleZoneCompleted(zone)} />
                            <span>
                              {zone.label} {zone.floor ? `(${zone.floor})` : ''}
                            </span>
                          </label>
                          <Button type="button" variant="ghost" onClick={() => removeZone(zone.id)}>
                            Retirer
                          </Button>
                        </div>
                      ))}
                      <div className="form-row">
                        <Input
                          label="Zone"
                          placeholder="Bâtiment A"
                          value={newZone.label}
                          onChange={(event) => setNewZone((prev) => ({ ...prev, label: event.target.value }))}
                        />
                        <Input
                          label="Étage"
                          placeholder="RDC"
                          value={newZone.floor}
                          onChange={(event) => setNewZone((prev) => ({ ...prev, floor: event.target.value }))}
                        />
                        <Button type="button" onClick={submitZone}>
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isEdit && siteId && qualityScore && (
                  <div className="form-field">
                    <span>Qualité (90 derniers jours)</span>
                    <div className="detail-grid" style={{ marginTop: '0.5rem' }}>
                      <div className="detail-grid__item">
                        <span>Score</span>
                        <strong>{qualityScore.score} / 100</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Interventions</span>
                        <strong>
                          {qualityScore.interventionsCompleted} / {qualityScore.interventionsTotal}
                        </strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>No-show</span>
                        <strong>{qualityScore.noShowCount}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Anomalies</span>
                        <strong>{qualityScore.anomalyCount}</strong>
                      </div>
                    </div>
                    {incidents.length > 0 && (
                      <ul className="list-line" style={{ marginTop: '0.5rem' }}>
                        {incidents.slice(0, 5).map((incident) => (
                          <li key={incident.id}>
                            {incident.interventionDate.slice(0, 10)} · {incident.type} — {incident.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {isEdit && siteId && (
                  <div className="form-field">
                    <span>Inventaire</span>
                    <div className="table-wrapper" style={{ marginTop: '0.5rem' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Article</th>
                            <th>Code-barres</th>
                            <th>Quantité</th>
                            <th>Seuil</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((item) => {
                            const low = item.quantity <= item.minThreshold;
                            return (
                              <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>{item.barcode || '—'}</td>
                                <td style={low ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td>{item.minThreshold}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <Button type="button" variant="ghost" className="btn--compact" onClick={() => adjustInventory(item.id, -1)}>
                                      -1
                                    </Button>
                                    <Button type="button" variant="ghost" className="btn--compact" onClick={() => adjustInventory(item.id, 1)}>
                                      +1
                                    </Button>
                                    <Button type="button" variant="ghost" className="btn--compact" onClick={() => removeInventoryItem(item.id)}>
                                      Retirer
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {inventory.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                                Aucun article enregistré.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="form-row" style={{ marginTop: '0.5rem' }}>
                      <Input
                        label="Article"
                        placeholder="Sacs poubelle"
                        value={newInventoryItem.name}
                        onChange={(event) => setNewInventoryItem((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <Input
                        label="Code-barres"
                        value={newInventoryItem.barcode}
                        onChange={(event) => setNewInventoryItem((prev) => ({ ...prev, barcode: event.target.value }))}
                      />
                      <Input
                        label="Unité"
                        placeholder="unité"
                        value={newInventoryItem.unit}
                        onChange={(event) => setNewInventoryItem((prev) => ({ ...prev, unit: event.target.value }))}
                      />
                      <Input
                        label="Quantité"
                        type="number"
                        value={newInventoryItem.quantity}
                        onChange={(event) => setNewInventoryItem((prev) => ({ ...prev, quantity: event.target.value }))}
                      />
                      <Input
                        label="Seuil min."
                        type="number"
                        value={newInventoryItem.minThreshold}
                        onChange={(event) => setNewInventoryItem((prev) => ({ ...prev, minThreshold: event.target.value }))}
                      />
                      <Button type="button" onClick={submitInventoryItem}>
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                {isEdit && siteId && qrCode && (
                  <div className="form-field">
                    <span>QR code de pointage</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <img src={qrCode.qrCodeDataUrl} alt="QR code de pointage" style={{ width: '140px', height: '140px' }} />
                      <Button type="button" variant="ghost" onClick={printQrCode}>
                        Imprimer
                      </Button>
                    </div>
                  </div>
                )}

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
