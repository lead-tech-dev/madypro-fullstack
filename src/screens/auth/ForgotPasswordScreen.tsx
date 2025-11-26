import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Réinitialiser</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Button title="Envoyer le lien" onPress={() => {}} />
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
