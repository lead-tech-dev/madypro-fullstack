import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { login as loginRequest } from '../services/api/auth.api';

export const useAuth = () => {
  const { user, token, login, logout, notify } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await loginRequest({ email, password });
      login(result.user, result.token);
      notify('Connexion réussie');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion impossible';
      setError(message);
      notify(message, 'error');
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
