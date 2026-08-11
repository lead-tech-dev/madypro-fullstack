import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStackParamList } from '@/navigation/types';

export default function AgentProfileScreen() {
  const { user, logout } = useAuthContext();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();

  React.useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      setNotificationsEnabled(false);
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Activez les notifications dans les réglages système.');
      setNotificationsEnabled(false);
      return;
    }
    setNotificationsEnabled(true);
  };

  return (
    <HeaderLayout
      title="Profil"
      subtitle="Informations personnelles et session"
      accent="Compte"
      scrollable={false}
      contentStyle={styles.profileContent}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <InfoRow label="Nom" value={user?.name ?? 'Agent'} />
        <InfoRow label="Email" value={user?.email ?? '—'} />
        <InfoRow label="Téléphone" value={user?.phone ?? 'Non renseigné'} />
        <InfoRow label="Rôle" value={user?.role ?? 'Agent'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Notifications push</Text>
            <Text style={styles.meta}>Recevoir rappels et alertes opérationnelles</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#d0c7be', true: theme.colors.primarySoft }}
            thumbColor={notificationsEnabled ? theme.colors.primary : '#f4f3f4'}
          />
        </View>
        <Button
          title="File d'attente hors ligne"
          variant="ghost"
          onPress={() => navigation.navigate('AgentSyncQueue')}
        />
        <Button
          title="Mes disponibilités"
          variant="ghost"
          onPress={() => navigation.navigate('AgentAvailability')}
        />
        <Button
          title="Messages avec mon superviseur"
          variant="ghost"
          onPress={() => navigation.navigate('AgentChat')}
        />
        <Button
          title="Scanner l'inventaire"
          variant="ghost"
          onPress={() => navigation.navigate('AgentInventoryScanner')}
        />
        <Button
          title="Modifier le mot de passe"
          variant="ghost"
          onPress={() => navigation.navigate('AgentChangePassword')}
        />
      </View>

      <Button
        title="Se déconnecter"
        onPress={() => {
          logout();
        }}
      />
    </HeaderLayout>
  );
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  profileContent: {
    flexGrow: 1,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  infoValue: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.muted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  settingLabel: {
    fontWeight: '600',
  },
});
