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
import { Card } from '@/components/ui/Card';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { InterventionCard } from '@/components/cards/InterventionCard';
import { Intervention } from '@/types/intervention';
import { listInterventionsByRange } from '@/services/api/interventions.api';
import { useAuthContext } from '@/context/AuthContext';
import { AgentStackParamList, AgentTabParamList } from '@/navigation/types';
import { useSyncContext } from '@/context/SyncContext';
import { buildDateTime, formatTime } from '@/utils/interventionTime';

type Navigation = CompositeNavigationProp<
  BottomTabNavigationProp<AgentTabParamList, 'AgentHome'>,
  NativeStackNavigationProp<AgentStackParamList>
>;

type PriorityMoment =
  | { kind: 'in-progress'; intervention: Intervention; since?: string }
  | { kind: 'upcoming'; intervention: Intervention; startsAt: Date }
  | { kind: 'none' };

function computePriorityMoment(interventions: Intervention[], userId?: string): PriorityMoment {
  if (!userId) return { kind: 'none' };
  const now = new Date();

  const inProgress = interventions.find((intervention) => {
    const mine = intervention.agents?.find((a) => a.id === userId);
    return Boolean(mine?.checkInTime) && !mine?.checkOutTime;
  });
  if (inProgress) {
    const mine = inProgress.agents.find((a) => a.id === userId);
    return { kind: 'in-progress', intervention: inProgress, since: mine?.checkInTime };
  }

  const upcoming = interventions
    .filter((intervention) => {
      const mine = intervention.agents?.find((a) => a.id === userId);
      return !mine?.checkOutTime && intervention.status !== 'CANCELLED';
    })
    .map((intervention) => ({ intervention, startsAt: buildDateTime(intervention.date, intervention.startTime) }))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .find(({ startsAt }) => startsAt.getTime() > now.getTime() - 60 * 60 * 1000); // garde les missions du jour même si l'heure est légèrement dépassée

  if (upcoming) {
    return { kind: 'upcoming', intervention: upcoming.intervention, startsAt: upcoming.startsAt };
  }

  return { kind: 'none' };
}

function formatCountdown(target: Date, now: Date) {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'maintenant';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `dans ${hours} h${rest ? ` ${rest}` : ''}`;
}

export default function AgentHomeScreen() {
  const [scope, setScope] = React.useState<'today' | 'week'>('today');
  const [interventions, setInterventions] = React.useState<{
    today: Intervention[];
    week: Intervention[];
  }>({ today: [], week: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());

  const navigation = useNavigation<Navigation>();
  const { token, user } = useAuthContext();
  const { flush, pendingEvents, isOnline } = useSyncContext();

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

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const priority = React.useMemo(
    () => computePriorityMoment(interventions.today, user?.id),
    [interventions.today, user?.id],
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

  const goToIntervention = (intervention: Intervention) =>
    navigation.navigate('AgentIntervention', { id: intervention.id });

  const firstName = user?.name?.split(' ')[0] ?? 'Agent';

  return (
    <HeaderLayout
      title={`Bonjour, ${firstName}`}
      subtitle="Retrouvez interventions, sites et absences en un clin d'œil."
      accent="Agent Madypro Clean"
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ gap: theme.spacing.lg }}
      >
        {pendingEvents.length > 0 && (
          <TouchableOpacity
            style={styles.syncBadge}
            onPress={() => navigation.navigate('AgentSyncQueue')}
          >
            <Text style={styles.syncBadgeText}>
              {isOnline
                ? `Synchronisation en cours… (${pendingEvents.length})`
                : `${pendingEvents.length} action(s) en attente de réseau`}
            </Text>
          </TouchableOpacity>
        )}
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : priority.kind === 'in-progress' ? (
          <Card style={styles.heroCard}>
            <Text style={styles.heroLabel}>Mission en cours</Text>
            <Text style={styles.heroSite}>{priority.intervention.siteName}</Text>
            <Text style={styles.heroTime}>
              {priority.intervention.startTime} – {priority.intervention.endTime}
              {priority.since ? ` · débutée à ${priority.since}` : ''}
            </Text>
            <Button title="Voir l'intervention" onPress={() => goToIntervention(priority.intervention)} />
          </Card>
        ) : priority.kind === 'upcoming' ? (
          <Card style={styles.heroCard}>
            <Text style={styles.heroLabel}>Prochaine mission · {formatCountdown(priority.startsAt, now)}</Text>
            <Text style={styles.heroSite}>{priority.intervention.siteName}</Text>
            <Text style={styles.heroTime}>
              {priority.intervention.startTime} – {priority.intervention.endTime}
            </Text>
            <Button title="Voir l'intervention" onPress={() => goToIntervention(priority.intervention)} />
          </Card>
        ) : (
          <Card style={styles.heroCardEmpty}>
            <Text style={styles.heroEmptyText}>Rien de prévu pour l'instant. Profitez-en !</Text>
          </Card>
        )}

        <View style={styles.block}>
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
                  onPress={goToIntervention}
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
  syncBadge: {
    backgroundColor: theme.colors.status.lateSoft,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  syncBadgeText: {
    color: theme.colors.status.late,
    fontSize: 12,
    fontFamily: theme.fonts.bodySemiBold,
  },
  heroCard: {
    backgroundColor: theme.colors.ink,
    gap: theme.spacing.xs,
  },
  heroCardEmpty: {
    backgroundColor: theme.colors.primarySoft,
  },
  heroLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.sage,
    fontFamily: theme.fonts.bodySemiBold,
  },
  heroSite: {
    fontSize: 22,
    fontFamily: theme.fonts.display,
    color: '#fff',
    marginTop: 2,
  },
  heroTime: {
    color: theme.colors.sage,
    marginBottom: theme.spacing.md,
  },
  heroEmptyText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
    textAlign: 'center',
  },
  block: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bodySemiBold,
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
    fontFamily: theme.fonts.bodySemiBold,
  },
  segmentLabelActive: {
    color: theme.colors.primary,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
