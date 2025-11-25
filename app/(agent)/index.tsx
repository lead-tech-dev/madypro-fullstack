import React, { useCallback } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../src/config/theme';
import { Button } from '../../src/components/ui/Button';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';
import { InterventionCard } from '../../src/components/cards/InterventionCard';
import { Intervention } from '../../src/types/intervention';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { useAuthContext } from '../../src/context/AuthContext';

export default function AgentHomeScreen() {
  const [scope, setScope] = React.useState<'today' | 'week'>('today');
  const [interventions, setInterventions] = React.useState<{
    today: Intervention[];
    week: Intervention[];
  }>({ today: [], week: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  console.log(interventions)

  const router = useRouter();
  const { token, user } = useAuthContext();

  const loadInterventions = useCallback(async () => {
    if (!token || !user) {
      setInterventions({ today: [], week: [] });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [todayList, weekList] = await Promise.all([
        listInterventionsByRange(token, 'today', user.id),
        listInterventionsByRange(token, 'week', user.id),
      ]);
      setInterventions({ today: todayList, week: weekList });
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

  return (
    <HeaderLayout
      title="Vos missions du jour"
      subtitle="Retrouvez interventions, sites et absences en un clin d'œil."
      accent="Agent Madypro Clean"
      trailing={<Button title="Pointage manuel" onPress={() => {}} />}
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
                  router.push({
                    pathname: '/(agent)/intervention/[id]',
                    params: { id: item.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      <Link href="/(agent)/requests" style={styles.link}>
        Déclarer une absence →
      </Link>
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
