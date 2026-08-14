import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../../services/api/categories.api';
import { InterventionCategory } from '../../types/category';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const CategoriesPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const [categories, setCategories] = useState<InterventionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    listCategories(token)
      .then(setCategories)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger les catégories', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !newLabel.trim()) return;
    setCreating(true);
    try {
      await createCategory(token, { label: newLabel.trim() });
      setNewLabel('');
      notify('Catégorie créée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible de créer la catégorie", 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (category: InterventionCategory) => {
    setEditingId(category.id);
    setEditLabel(category.label);
  };

  const saveEdit = async (id: string) => {
    if (!token || !editLabel.trim()) return;
    try {
      await updateCategory(token, id, { label: editLabel.trim() });
      setEditingId(null);
      notify('Catégorie mise à jour');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de mettre à jour', 'error');
    }
  };

  const toggleActive = async (category: InterventionCategory) => {
    if (!token) return;
    try {
      await updateCategory(token, category.id, { active: !category.active });
      notify(category.active ? 'Catégorie désactivée' : 'Catégorie activée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de modifier le statut', 'error');
    }
  };

  const remove = async (category: InterventionCategory) => {
    if (!token) return;
    if (!window.confirm(`Supprimer la catégorie "${category.label}" ?`)) return;
    try {
      await deleteCategory(token, category.id);
      notify('Catégorie supprimée');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Impossible de supprimer', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Paramètres</span>
        <h2>Catégories d'intervention</h2>
        <p>
          Le catalogue des types d'intervention (nettoyage vitres, ménage, private, hivernage...). Associez-les
          ensuite à un site depuis sa fiche pour définir l'horaire et la checklist propres à chaque catégorie sur
          ce site.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <Input
            id="newLabel"
            name="newLabel"
            label="Nouvelle catégorie"
            placeholder="Nettoyage vitres"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button type="submit" disabled={!newLabel.trim() || creating}>
            {creating ? 'Ajout...' : 'Ajouter'}
          </Button>
        </form>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table className="table" aria-label="catégories d'intervention">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    {editingId === category.id ? (
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    ) : (
                      category.label
                    )}
                  </td>
                  <td>
                    <span className={`status-chip ${category.active ? 'status-chip--success' : 'status-chip--warning'}`}>
                      {category.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {editingId === category.id ? (
                        <>
                          <Button type="button" className="btn--compact" onClick={() => saveEdit(category.id)}>
                            Enregistrer
                          </Button>
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => startEdit(category)}>
                            Modifier
                          </Button>
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => toggleActive(category)}>
                            {category.active ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button type="button" variant="ghost" className="btn--compact" onClick={() => remove(category)}>
                            Supprimer
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    Aucune catégorie définie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
