import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/context/AuthContext';
import { changePassword } from '@/services/api/auth.api';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStackParamList } from '@/navigation/types';

export default function AgentChangePasswordScreen() {
  const { token } = useAuthContext();
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Champs requis', 'Remplissez tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(token, { currentPassword, newPassword });
      Alert.alert('Succès', 'Mot de passe mis à jour');
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de changer le mot de passe';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HeaderLayout
      title="Modifier le mot de passe"
      subtitle="Sécurisez votre compte"
      accent="Compte"
      trailing={
        <Button title="Retour" variant="ghost" size="sm" onPress={() => navigation.goBack()} />
      }
    >
      <View style={styles.card}>
        <Input
          label="Mot de passe actuel"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label="Nouveau mot de passe"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Input
          label="Confirmer le nouveau"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button title={loading ? 'En cours...' : 'Enregistrer'} onPress={handleSubmit} disabled={loading} />
      </View>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
