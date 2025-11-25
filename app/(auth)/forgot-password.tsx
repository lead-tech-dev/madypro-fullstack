import React, { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { theme } from '../../src/config/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Réinitialiser</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Button title="Envoyer le lien" onPress={() => {}} />
        <Link href="/(auth)/login" style={styles.link}>
          Retour connexion
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.cream,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  link: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
  },
});
