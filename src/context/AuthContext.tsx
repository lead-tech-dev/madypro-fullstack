import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // purge les données locales liées à l'utilisateur précédent
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const keysToRemove = keys.filter(
          (key) => key === 'syncQueue' || key.startsWith('intervention:start:'),
        );
        if (keysToRemove.length) {
          AsyncStorage.multiRemove(keysToRemove).catch(() => {});
        }
      })
      .catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
