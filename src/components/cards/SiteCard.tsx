import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Site } from '../../types/site';
import { theme } from '../../config/theme';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/StatusPill';

export const SiteCard: React.FC<{ site: Site }> = ({ site }) => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{site.name}</Text>
      <StatusPill label={site.active ? 'Actif' : 'Inactif'} tone={site.active ? 'success' : 'neutral'} />
    </View>
    <Text style={styles.meta}>{site.address}</Text>
    {site.timeWindow && <Text style={styles.meta}>Fenêtre : {site.timeWindow}</Text>}
  </Card>
);

const styles = StyleSheet.create({
  card: {
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
    fontFamily: theme.fonts.bodySemiBold,
  },
  meta: {
    marginTop: 8,
    color: theme.colors.muted,
  },
});
