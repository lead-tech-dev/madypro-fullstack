import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Switch } from 'react-native';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { useAuthContext } from '../../src/context/AuthContext';
import { listSites } from '../../src/services/api/sites.api';
import { Site } from '../../src/types/site';
import { theme } from '../../src/config/theme';
import { Button } from '../../src/components/ui/Button';

export default function SupervisorProfileScreen() {
  const { user, token, logout } = useAuthContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    if (!token) return;
    listSites(token)
      .then(setSites)
      .catch(() => setSites([]));
  }, [token]);

  const mySites = useMemo(() => {
    if (!user) return [];
    return sites.filter((site) => site.supervisors?.some((sup) => sup.id === user.id));
  }, [sites, user]);

  return (
    <HeaderLayout
      title="Profil superviseur"
      subtitle={user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
      accent="Superviseur"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Informations</Text>
          <Text style={styles.meta}>Nom : {user?.lastName ?? '—'}</Text>
          <Text style={styles.meta}>Prénom : {user?.firstName ?? '—'}</Text>
          <Text style={styles.meta}>Rôle : {user?.role ?? 'SUPERVISOR'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.meta}>Activer / désactiver les alertes push</Text>
            </View>
            <Switch value={notifEnabled} onValueChange={setNotifEnabled} />
          </View>
          <Text style={styles.helper}>
            Nouveaux problèmes, interventions ponctuelles, annulations et besoins de revue.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sites supervisés</Text>
          {mySites.length === 0 ? (
            <Text style={styles.meta}>Aucun site associé.</Text>
          ) : (
            mySites.map((site) => (
              <View key={site.id} style={styles.siteRow}>
                <View>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.meta}>{site.address}</Text>
                </View>
                <Text style={styles.badge}>{site.clientName}</Text>
              </View>
            ))
          )}
        </View>

        <Button title="Se déconnecter" variant="ghost" onPress={logout} />
      </ScrollView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.muted,
  },
  helper: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteRow: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  siteName: {
    fontWeight: '700',
  },
  badge: {
    backgroundColor: theme.colors.shell,
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
});
