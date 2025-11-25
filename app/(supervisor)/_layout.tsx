import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const tabIcon = (name: keyof typeof Ionicons.glyphMap) => ({
  tabBarIcon: ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  ),
});

export default function SupervisorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          ...tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="manual-check"
        options={{
          title: 'Pointage',
          ...tabIcon('clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="absences"
        options={{
          title: 'Absences',
          ...tabIcon('calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="interventions"
        options={{
          title: 'Interventions',
          ...tabIcon('list-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          ...tabIcon('time-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          ...tabIcon('person-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="intervention/[id]"
        options={{
          href: null,
          ...tabIcon('information-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="site/[id]"
        options={{
          href: null,
          ...tabIcon('business-outline'),
        }}
      />
    </Tabs>
  );
}
