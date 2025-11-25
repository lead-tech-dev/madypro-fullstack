import React, { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/config/theme';

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await login(email, password);
      if (!response) return;
      router.replace(response.user.role === 'SUPERVISOR' ? '/(supervisor)' : '/(agent)');
    } catch {
      // handled by hook error state
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.pill}>Madypro Clean</Text>
        <Text style={styles.title}>Connexion</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={handleSubmit} />
        <Link href="/(auth)/forgot-password" style={styles.link}>
          Mot de passe oublié
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
  pill: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: theme.colors.muted,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  link: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
  },
  error: {
    color: theme.colors.danger,
  },
});
