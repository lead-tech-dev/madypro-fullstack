import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { changePassword } from '@/services/api/auth.api';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStackParamList } from '@/navigation/types';

export default function AgentChangePasswordScreen() {
  const { token } = useAuthContext();
  const { showToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Champs requis', 'Remplissez tous les champs.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Erreur', 'Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    setLoading(true);
    try {
      await changePassword(token, { currentPassword, newPassword });
      showToast('Succès', 'Mot de passe mis à jour', 'success');
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de changer le mot de passe';
      showToast('Erreur', message, 'error');
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
        <View style={styles.cardHeader}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardHeaderText}>Sécurité du compte</Text>
        </View>
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
        <Button
          title={loading ? 'En cours...' : 'Enregistrer'}
          icon="checkmark-circle-outline"
          onPress={handleSubmit}
          disabled={loading}
        />
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cardHeaderText: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 15,
    color: theme.colors.ink,
  },
});
