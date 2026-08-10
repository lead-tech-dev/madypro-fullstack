import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { InterventionCard } from '@/components/cards/InterventionCard';
import { Intervention } from '@/types/intervention';
import { listInterventionsByRange } from '@/services/api/interventions.api';
import { useAuthContext } from '@/context/AuthContext';
import { AgentStackParamList, AgentTabParamList } from '@/navigation/types';
import { useSyncContext } from '@/context/SyncContext';

type Navigation = CompositeNavigationProp<
  BottomTabNavigationProp<AgentTabParamList, 'AgentHome'>,
  NativeStackNavigationProp<AgentStackParamList>
>;

export default function AgentHomeScreen() {
  const [scope, setScope] = React.useState<'today' | 'week'>('today');
  const [interventions, setInterventions] = React.useState<{
    today: Intervention[];
    week: Intervention[];
  }>({ today: [], week: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const navigation = useNavigation<Navigation>();
  const { token, user } = useAuthContext();
  const { flush } = useSyncContext();

  const loadInterventions = useCallback(async () => {
    if (!token || !user) {
      setInterventions({ today: [], week: [] });
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [todayList, weekList] = await Promise.all([
        listInterventionsByRange(token, 'today', user.id),
        listInterventionsByRange(token, 'week', user.id),
      ]);
      setInterventions({ today: todayList, week: weekList });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les interventions');
      setInterventions({ today: [], week: [] });
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  React.useEffect(() => {
    loadInterventions();
  }, [loadInterventions]);

  useFocusEffect(
    React.useCallback(() => {
      loadInterventions();
    }, [loadInterventions]),
  );

  const displayed = scope === 'today' ? interventions.today : interventions.week;
  const emptyLabel =
    scope === 'today'
      ? 'Aucune intervention prévue aujourd’hui.'
      : 'Aucune intervention planifiée cette semaine.';

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await flush();
      await loadInterventions();
    } finally {
      setRefreshing(false);
    }
  }, [flush, loadInterventions]);

  return (
    <HeaderLayout
      title="Vos missions du jour"
      subtitle="Retrouvez interventions, sites et absences en un clin d'œil."
      accent="Agent Madypro Clean"
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ gap: theme.spacing.lg }}
      >
        <View style={styles.segmented}>
          {[
            { label: 'Aujourd’hui', value: 'today' as const },
            { label: 'Cette semaine', value: 'week' as const },
          ].map((tab) => {
            const active = scope === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setScope(tab.value)}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>
            {scope === 'today' ? 'Planning du jour' : 'Planning à venir'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : displayed.length === 0 ? (
            <Text style={styles.empty}>{emptyLabel}</Text>
          ) : (
            <View style={styles.stack}>
              {displayed.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  onPress={(item) =>
                    navigation.navigate('AgentIntervention', {
                      id: item.id,
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('AgentRequests')}>
          <Text style={styles.link}>Déclarer une absence →</Text>
        </TouchableOpacity>
      </ScrollView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  stack: {
    gap: theme.spacing.md,
  },
  link: {
    marginTop: theme.spacing.lg,
    color: theme.colors.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.radii.pill,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  segmentLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: theme.colors.primary,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
