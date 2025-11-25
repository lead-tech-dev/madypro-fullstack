import React from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/config/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page introuvable</Text>
      <Link href="/(agent)" style={styles.link}>
        Retour à l'accueil agent
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  link: {
    marginTop: theme.spacing.md,
    color: theme.colors.ink,
    textTransform: 'uppercase',
  },
});
