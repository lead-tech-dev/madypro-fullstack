import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/config/theme';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await login(email, password);
      if (!response) {
        return;
      }
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
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Mot de passe oublié</Text>
        </TouchableOpacity>
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
