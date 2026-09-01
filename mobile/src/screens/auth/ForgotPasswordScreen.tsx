import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { theme } from '@/config/theme';
import { AuthStackParamList } from '@/navigation/types';
import { forgotPassword } from '@/services/api/auth.api';
import { useToast } from '@/context/ToastContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la demande';
      showToast('Erreur', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Mot de passe oublié" subtitle="Recevez un lien pour réinitialiser votre mot de passe." showBack />
      <Card style={styles.card}>
        {submitted ? (
          <>
            <Text style={styles.success}>
              Vérifiez vos emails. Si un compte existe avec cette adresse, vous recevrez un lien pour
              réinitialiser votre mot de passe.
            </Text>
            <Button fullWidth variant="primary" title="Retour connexion" onPress={() => navigation.navigate('Login')} />
          </>
        ) : (
          <>
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <Button
              fullWidth
              variant="primary"
              title={loading ? 'Envoi...' : 'Envoyer'}
              onPress={handleSubmit}
              disabled={loading || !email}
            />
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Retour connexion</Text>
            </TouchableOpacity>
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.cream,
    gap: theme.spacing.lg,
  },
  card: {
    gap: theme.spacing.md,
  },
  link: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  success: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.body,
    lineHeight: 20,
  },
});
