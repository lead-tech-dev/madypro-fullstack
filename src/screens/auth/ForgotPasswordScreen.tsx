import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { AuthStackParamList } from '@/navigation/types';
import { forgotPassword } from '@/services/api/auth.api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Réinitialiser</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Button
          title={loading ? 'Envoi...' : 'Envoyer'}
          onPress={async () => {
            if (!email) return;
            setLoading(true);
            try {
              const res = await forgotPassword(email);
              const pwd = res.password ? ` Nouveau mot de passe provisoire : ${res.password}` : '';
              Alert.alert('Réinitialisation', `Si le compte existe, un reset a été effectué.${pwd}`);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Erreur lors de la demande';
              Alert.alert('Erreur', message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        />
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Retour connexion</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  link: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
  },
});
