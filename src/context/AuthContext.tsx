import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/auth';
import { AUTH_STORAGE_KEY } from '../config/storage';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as { user: AuthUser; token: string };
          setUser(parsed.user);
          setToken(parsed.token);
        }
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken })).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // purge les données locales liées à l'utilisateur précédent
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const keysToRemove = keys.filter(
          (key) => key === 'syncQueue' || key === AUTH_STORAGE_KEY || key.startsWith('intervention:start:'),
        );
        if (keysToRemove.length) {
          AsyncStorage.multiRemove(keysToRemove).catch(() => {});
        }
      })
      .catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, token, isReady, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
