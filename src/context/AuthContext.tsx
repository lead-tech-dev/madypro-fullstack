import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/auth';
import { AUTH_STORAGE_KEY } from '../config/storage';
import { secureStorage } from '../services/secureStorage';
import { setUnauthorizedHandler } from '../services/api/client';

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
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const restore = async () => {
      let raw = await secureStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        // Migration depuis l'ancien stockage AsyncStorage (non chiffré) : à supprimer une fois
        // que les utilisateurs auront tous mis à jour vers la version avec expo-secure-store.
        const legacy = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (legacy) {
          await secureStorage.setItem(AUTH_STORAGE_KEY, legacy);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          raw = legacy;
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw) as { user: AuthUser; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
      }
    };
    restore()
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken })).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    secureStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    // purge les données locales liées à l'utilisateur précédent
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const keysToRemove = keys.filter((key) => key === 'syncQueue' || key.startsWith('intervention:start:'));
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
