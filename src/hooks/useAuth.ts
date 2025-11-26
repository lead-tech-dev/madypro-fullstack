import { useState } from 'react';
import { login as loginRequest } from '../services/api/auth.api';
import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, token, login, logout } = useAuthContext();

  const authenticate = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginRequest(email, password);
      if (response.user.role !== 'AGENT') {
        const message = "Cet espace mobile est réservé aux agents. Merci d'utiliser la version web.";
        setError(message);
        throw new Error('ROLE_NOT_ALLOWED');
      }
      login(response.user, response.token);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    token,
    loading,
    error,
    login: authenticate,
    logout,
  };
};
