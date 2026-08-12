import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { CustomForm, CustomFormSubmission, FormField, FormFieldType } from '../../types/form';
import { listForms, createForm, archiveForm, listFormSubmissions } from '../../services/api/forms.api';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/datetime';

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Oui/Non' },
  { value: 'textarea', label: 'Texte long' },
];

const emptyField = (): FormField => ({ key: '', label: '', type: 'text', required: false });

export const FormsPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<FormField[]>([emptyField()]);
  const [creating, setCreating] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState<CustomForm | null>(null);
  const [submissions, setSubmissions] = useState<CustomFormSubmission[]>([]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    listForms(token)
      .then(setForms)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les formulaires', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !name.trim() || !fields.length || fields.some((f) => !f.key.trim() || !f.label.trim())) {
      notify('Nom du formulaire et clé/libellé pour chaque champ requis', 'error');
      return;
    }
    setCreating(true);
    try {
      await createForm(token, name.trim(), fields);
      notify('Formulaire créé');
      setName('');
      setFields([emptyField()]);
      setFormVisible(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Création impossible', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (form: CustomForm) => {
    if (!token) return;
    try {
      await archiveForm(token, form.id);
      notify('Formulaire archivé');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Archivage impossible', 'error');
    }
  };

  const openSubmissions = async (form: CustomForm) => {
    if (!token) return;
    setViewingSubmissions(form);
    try {
      const data = await listFormSubmissions(token, form.id);
      setSubmissions(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de charger les soumissions', 'error');
      setSubmissions([]);
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="pill">Formulaires</span>
        <h2>Formulaires personnalisables</h2>
        <p>Construisez des formulaires terrain (checklists, rapports) remplis depuis mobile ou un lien partagé.</p>
        <Button type="button" onClick={() => setFormVisible((v) => !v)}>
          {formVisible ? 'Fermer' : 'Nouveau formulaire'}
        </Button>
      </div>

      {formVisible && (
        <form className="form-card" onSubmit={handleCreate} style={{ marginBottom: '1.5rem' }}>
          <Input id="formName" label="Nom du formulaire" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="form-field">
            <span>Champs</span>
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
              {fields.map((field, index) => (
                <div key={index} className="form-row">
                  <Input
                    label="Clé"
                    placeholder="niveau_proprete"
                    value={field.key}
                    onChange={(event) => updateField(index, { key: event.target.value })}
                  />
                  <Input
                    label="Libellé"
                    placeholder="Niveau de propreté"
                    value={field.label}
                    onChange={(event) => updateField(index, { label: event.target.value })}
                  />
                  <Select
                    label="Type"
                    options={FIELD_TYPE_OPTIONS}
                    value={field.type}
                    onChange={(event) => updateField(index, { type: event.target.value as FormFieldType })}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(event) => updateField(index, { required: event.target.checked })}
                    />
                    Obligatoire
                  </label>
                  <Button type="button" variant="ghost" onClick={() => removeField(index)} disabled={fields.length === 1}>
                    Retirer
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => setFields((prev) => [...prev, emptyField()])}>
                Ajouter un champ
              </Button>
            </div>
          </div>
          <div className="form-actions">
            <Button type="submit" disabled={creating}>
              {creating ? 'Création...' : 'Créer le formulaire'}
            </Button>
          </div>
        </form>
      )}

      <section className="panel">
        <h3>Formulaires actifs</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : forms.length === 0 ? (
          <p className="card__meta">Aucun formulaire.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table" aria-label="formulaires">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Champs</th>
                  <th>Créé le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id}>
                    <td>{form.name}</td>
                    <td>{form.fields.map((f) => f.label).join(', ')}</td>
                    <td>{formatDateTime(form.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <Button type="button" variant="ghost" className="btn--compact" onClick={() => openSubmissions(form)}>
                          Soumissions
                        </Button>
                        <Button type="button" variant="ghost" className="btn--compact" onClick={() => handleArchive(form)}>
                          Archiver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewingSubmissions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Soumissions — {viewingSubmissions.name}</h3>
              <Button type="button" variant="ghost" onClick={() => setViewingSubmissions(null)}>
                Fermer
              </Button>
            </div>
            {submissions.length === 0 ? (
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Aucune soumission pour ce formulaire.
              </p>
            ) : (
              <ul className="list-line" style={{ marginTop: '1rem' }}>
                {submissions.map((submission) => (
                  <li key={submission.id} style={{ display: 'block' }}>
                    <strong>{formatDateTime(submission.createdAt)}</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: '0.25rem 0 0' }}>{JSON.stringify(submission.data, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
