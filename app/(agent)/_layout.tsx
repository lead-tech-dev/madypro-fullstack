import React from 'react';
import { Tabs } from 'expo-router';
import { AgentTabBar } from '../../src/components/navigation/AgentTabBar';

const TAB_MAP = {
  index: { label: 'Accueil', icon: 'home-outline' },
  history: { label: 'Historique', icon: 'time-outline' },
  requests: { label: 'Absences', icon: 'calendar-outline' },
  notifications: { label: 'Notifications', icon: 'notifications-outline' },
  profile: { label: 'Profil', icon: 'person-circle-outline' },
} as const;

export default function AgentLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AgentTabBar {...props} iconMap={TAB_MAP} />}
    >
      <Tabs.Screen name="index" options={{ title: TAB_MAP.index.label }} />
      <Tabs.Screen name="history" options={{ title: TAB_MAP.history.label }} />
      <Tabs.Screen name="requests" options={{ title: TAB_MAP.requests.label }} />
      <Tabs.Screen name="notifications" options={{ title: TAB_MAP.notifications.label }} />
      <Tabs.Screen name="profile" options={{ title: TAB_MAP.profile.label }} />
      <Tabs.Screen
        name="intervention/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
