import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AgentStackParamList } from '@/navigation/types';
import { listMyOnboarding, OnboardingItem, setOnboardingItemDone } from '@/services/api/onboarding.api';

export default function AgentOnboardingChecklistScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const { token, user } = useAuthContext();
  const { showToast } = useToast();

  const [items, setItems] = React.useState<OnboardingItem[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const data = await listMyOnboarding(token, user.id);
      setItems(data);
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible de charger le parcours.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user, showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (item: OnboardingItem) => {
    if (!token) return;
    setBusyId(item.id);
    try {
      const updated = await setOnboardingItemDone(token, item.id, !item.done);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Action impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <HeaderLayout
      title="Parcours d'intégration"
      subtitle="Vos étapes d'onboarding"
      accent="Équipe"
      trailing={
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      }
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Aucune étape d'intégration assignée pour le moment.</Text>
      ) : (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {doneCount} / {items.length} étapes complétées
            </Text>
          </View>
          <View style={styles.list}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => toggle(item)}
                disabled={busyId === item.id}
              >
                <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                  {item.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemLabel, item.done && styles.itemLabelDone]}>{item.label}</Text>
                  {item.done && item.completedAt && (
                    <Text style={styles.itemMeta}>
                      Terminé le {new Date(item.completedAt).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
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
  progressRow: {
    marginBottom: theme.spacing.lg,
  },
  progressText: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.bodySemiBold,
  },
  list: {
    gap: theme.spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemLabel: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
  },
  itemLabelDone: {
    color: theme.colors.muted,
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
