import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { SyncProvider } from '../src/context/SyncContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <NotificationProvider>
          <StatusBar barStyle="dark-content" />
          <Stack screenOptions={{ headerShown: false }} />
        </NotificationProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
