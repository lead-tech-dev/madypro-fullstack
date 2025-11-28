import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Site } from '../../types/site';
import { theme } from '../../config/theme';

export const SiteCard: React.FC<{ site: Site }> = ({ site }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{site.name}</Text>
      <View style={[styles.statusPill, site.active ? styles.statusActive : styles.statusInactive]}>
        <Text style={styles.statusText}>{site.active ? 'Actif' : 'Inactif'}</Text>
      </View>
    </View>
    <Text style={styles.meta}>{site.address}</Text>
    {site.timeWindow && <Text style={styles.meta}>Fenêtre : {site.timeWindow}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: 4,
  },
  meta: {
    marginTop: 8,
    color: theme.colors.muted,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: theme.colors.sage,
  },
  statusInactive: {
    backgroundColor: theme.colors.clay,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink,
    textTransform: 'uppercase',
  },
});
