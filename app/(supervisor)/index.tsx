import React, { useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SiteCard } from '../../src/components/cards/SiteCard';
import { listSites } from '../../src/services/api/sites.api';
import { listInterventionsByRange } from '../../src/services/api/interventions.api';
import { Site } from '../../src/types/site';
import { Intervention } from '../../src/types/intervention';
import { theme } from '../../src/config/theme';
import { useAuthContext } from '../../src/context/AuthContext';
import { HeaderLayout } from '../../src/components/layout/HeaderLayout';

const todayISO = new Date().toISOString().split('T')[0];

export default function SupervisorDashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const router = useRouter();
  const { token } = useAuthContext();

  useEffect(() => {
    if (!token) {
      setSites([]);
      setInterventions([]);
      return;
    }
    listSites(token).then(setSites);
    listInterventionsByRange(token, 'today').then(setInterventions);
  }, [token]);

  const metrics = useMemo(() => {
    const todayInterventions = interventions.filter((item) => item.date === todayISO);
    const grouped: Record<
      string,
      {
        total: number;
        completed: number;
        inProgress: number;
        planned: number;
        anomalies: boolean;
        punctual: boolean;
        trucks: boolean;
      }
    > = {};
    todayInterventions.forEach((intervention) => {
      if (!grouped[intervention.siteId]) {
        grouped[intervention.siteId] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          planned: 0,
          anomalies: false,
          punctual: false,
          trucks: false,
        };
      }
      const bucket = grouped[intervention.siteId];
      bucket.total += 1;
      if (intervention.status === 'COMPLETED') bucket.completed += 1;
      else if (intervention.status === 'IN_PROGRESS') bucket.inProgress += 1;
      else bucket.planned += 1;
      if (intervention.hasAnomaly || intervention.status === 'NO_SHOW') {
        bucket.anomalies = true;
      }
      if (intervention.type === 'PUNCTUAL') {
        bucket.punctual = true;
        if (intervention.truckLabels?.length) {
          bucket.trucks = true;
        }
      }
    });
    return grouped;
  }, [interventions]);

  return (
    <HeaderLayout
      title="Mes sites – Aujourd’hui"
      subtitle="Suivez vos sites, leurs interventions et les anomalies du jour."
      accent="Superviseur"
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sites.map((site) => {
          const stats = metrics[site.id] ?? { total: 0, completed: 0, inProgress: 0, planned: 0, anomalies: false };
          const completion =
            stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          return (
            <TouchableOpacity
              key={site.id}
              style={styles.siteBlock}
              onPress={() => router.push({ pathname: '/(supervisor)/site/[id]', params: { id: site.id } })}
            >
              <SiteCard site={site} />
              {site.address ? <Text style={styles.address}>{site.address}</Text> : null}
              <View style={styles.metrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.completed}</Text>
                  <Text style={styles.metricLabel}>✔️ Terminées</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.inProgress}</Text>
                  <Text style={styles.metricLabel}>🟡 En cours</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.planned}</Text>
                  <Text style={styles.metricLabel}>❌ À démarrer</Text>
                </View>
              </View>
              <View style={styles.badgesRow}>
                {stats.anomalies && <Text style={styles.anomaly}>⚠️ Anomalies / No show</Text>}
                {stats.punctual && <Text style={styles.badge}>Ponctuel(s)</Text>}
                {stats.trucks && <Text style={styles.badge}>Camion(s)</Text>}
                <Text style={styles.badgeMuted}>{stats.total} interventions</Text>
                <Text style={styles.badgeMuted}>{completion}% terminé</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Link href="/(supervisor)/manual-check" style={styles.link}>
          Pointage manuel global →
        </Link>
      </ScrollView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.muted,
  },
  siteBlock: {
    gap: theme.spacing.sm,
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  address: {
    color: theme.colors.muted,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  siteLink: {
    color: theme.colors.muted,
  },
  anomaly: {
    color: '#c62828',
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    fontWeight: '600',
  },
  badgeMuted: {
    backgroundColor: theme.colors.shell,
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    fontWeight: '600',
  },
  link: {
    textTransform: 'uppercase',
    color: theme.colors.muted,
    textAlign: 'center',
  },
  header: {},
  pill: {},
});
