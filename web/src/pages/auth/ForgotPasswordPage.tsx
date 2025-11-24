import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { requestPasswordReset } from '../../services/api/auth.api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNewPassword(null);
    try {
      const response = await requestPasswordReset(email);
      setNewPassword(response.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de réinitialiser le mot de passe';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__intro">
        <span className="pill">Support Madypro Clean</span>
        <h1>Réinitialiser le mot de passe</h1>
        <p>
          Envoyez un lien sécurisé à votre adresse professionnelle pour reprendre le contrôle du
          portail Admin / Superviseur Madypro Clean et de ses opérations de nettoyage.
        </p>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <Input
          id="reset-email"
          type="email"
          label="Email professionnel"
          placeholder="vous@madyproclean.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {error && <p className="form-error">{error}</p>}
        {newPassword && (
          <p className="form-success">
            Nouveau mot de passe généré : <strong>{newPassword}</strong>
          </p>
        )}
        <div className="form-actions">
          <Button type="submit" disabled={loading}>
            {loading ? 'Envoi…' : 'Réinitialiser'}
          </Button>
          <Link to="/login" className="btn btn--ghost">
            Retour connexion
          </Link>
        </div>
      </form>
    </div>
  );
};
