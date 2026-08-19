import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { AbsenceRequestForm } from '@/components/forms/AbsenceRequestForm';
import { useAuthContext } from '@/context/AuthContext';
import { theme } from '@/config/theme';
import { AgentStackParamList } from '@/navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function AgentAbsenceFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const { token, user } = useAuthContext();

  return (
    <HeaderLayout
      title="Nouvelle absence"
      subtitle="Soumettez une demande"
      accent="Absences"
      trailing={
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      }
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardHeaderText}>Formulaire de demande</Text>
        </View>
        {token && user ? (
          <AbsenceRequestForm
            token={token}
            userId={user.id}
            onSubmitted={() => {
              navigation.goBack();
            }}
          />
        ) : null}
      </View>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
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
    marginBottom: theme.spacing.md,
  },
  cardHeaderText: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
    fontSize: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
