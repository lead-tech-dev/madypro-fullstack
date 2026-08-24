import React from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useStaggeredFadeIn } from '@/hooks/useStaggeredFadeIn';
import { AgentStackParamList } from '@/navigation/types';
import {
  acceptShiftSwap,
  cancelShiftSwap,
  createShiftSwap,
  listShiftSwapColleagues,
  listShiftSwaps,
  rejectShiftSwap,
  ShiftSwapColleague,
  ShiftSwapRequest,
  ShiftSwapStatus,
} from '@/services/api/shift-swaps.api';
import { listSites } from '@/services/api/sites.api';
import { listInterventionsByRange } from '@/services/api/interventions.api';
import { Intervention } from '@/types/intervention';

const STATUS_META: Record<ShiftSwapStatus, { label: string; color: string; background: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'En attente', color: '#b46a00', background: '#fff6e8', icon: 'time-outline' },
  ACCEPTED: { label: 'Acceptée', color: '#0b874b', background: '#e6f5ef', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Refusée', color: '#c62828', background: '#fdecef', icon: 'close-circle-outline' },
  CANCELLED: { label: 'Annulée', color: theme.colors.muted, background: '#eef1f0', icon: 'ban-outline' },
};

const formatDate = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
};

export default function AgentShiftSwapsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const route = useRoute<RouteProp<AgentStackParamList, 'AgentShiftSwaps'>>();
  const { token, user } = useAuthContext();
  const { showToast } = useToast();
  const { getItemStyle } = useStaggeredFadeIn();

  const [swaps, setSwaps] = React.useState<ShiftSwapRequest[]>([]);
  const [siteNames, setSiteNames] = React.useState<Record<string, string>>({});
  const [isLoading, setLoading] = React.useState(true);
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [newRequestFor, setNewRequestFor] = React.useState(route.params);
  const [isPickerOpen, setPickerOpen] = React.useState(false);
  const [eligibleInterventions, setEligibleInterventions] = React.useState<Intervention[]>([]);
  const [isLoadingEligible, setLoadingEligible] = React.useState(false);
  const [colleagueSearch, setColleagueSearch] = React.useState('');
  const [colleagueResults, setColleagueResults] = React.useState<ShiftSwapColleague[]>([]);
  const [isSearchingColleagues, setSearchingColleagues] = React.useState(false);
  const [selectedTarget, setSelectedTarget] = React.useState<ShiftSwapColleague | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listShiftSwaps(token);
      setSwaps(data);
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible de charger les échanges.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    if (!token) return;
    listSites(token)
      .then((sites) => {
        setSiteNames(Object.fromEntries(sites.map((s) => [s.id, s.name])));
      })
      .catch(() => {});
  }, [token]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (!token || !user) return;
    setLoadingEligible(true);
    try {
      const data = await listInterventionsByRange(token, 'week', user.id);
      setEligibleInterventions(
        data.filter((i) => i.status === 'PLANNED' && !i.agents?.find((a) => a.id === user.id)?.checkInTime),
      );
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible de charger vos missions.', 'error');
    } finally {
      setLoadingEligible(false);
    }
  };

  const pickIntervention = (intervention: Intervention) => {
    setNewRequestFor({
      interventionId: intervention.id,
      siteName: intervention.siteName,
      date: intervention.date,
      startTime: intervention.startTime,
      endTime: intervention.endTime,
    });
    setSelectedTarget(null);
    setColleagueSearch('');
    setColleagueResults([]);
    setPickerOpen(false);
  };

  React.useEffect(() => {
    if (!token) return;
    const query = colleagueSearch.trim();
    if (query.length < 2) {
      setColleagueResults([]);
      return;
    }
    setSearchingColleagues(true);
    const timeout = setTimeout(() => {
      listShiftSwapColleagues(token, query)
        .then(setColleagueResults)
        .catch(() => setColleagueResults([]))
        .finally(() => setSearchingColleagues(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [token, colleagueSearch]);

  const handleSubmit = async () => {
    if (!token || !newRequestFor) return;
    setSubmitting(true);
    try {
      await createShiftSwap(token, newRequestFor.interventionId, reason.trim() || undefined, selectedTarget?.id);
      showToast('Demande envoyée', 'Votre proposition d’échange a été transmise.', 'success');
      setReason('');
      setSelectedTarget(null);
      setColleagueSearch('');
      setColleagueResults([]);
      setNewRequestFor(undefined);
      load();
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible d’envoyer la demande.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (id: string, action: (token: string, id: string) => Promise<ShiftSwapRequest>, successMsg: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await action(token, id);
      showToast(successMsg, undefined, 'success');
      load();
    } catch (err) {
      showToast('Action impossible', err instanceof Error ? err.message : 'Erreur inconnue', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const mine = swaps.filter((s) => s.requesterId === user?.id);
  const forMe = swaps.filter(
    (s) => s.requesterId !== user?.id && (s.targetUserId === user?.id || (s.targetUserId === null && s.status === 'PENDING')),
  );

  const renderSwap = (swap: ShiftSwapRequest, index: number, mode: 'mine' | 'forMe') => {
    const statusMeta = STATUS_META[swap.status];
    const siteLabel = siteNames[swap.intervention.siteId] ?? 'Site';
    return (
      <Animated.View key={swap.id} style={getItemStyle(index)}>
        <View style={styles.item}>
          <View style={styles.itemHeader}>
            <View style={styles.titleRow}>
              <View style={styles.bullet} />
              <Text style={styles.itemTitle}>{siteLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusMeta.background, borderColor: statusMeta.color }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} style={styles.badgeIcon} />
              <Text style={[styles.badgeLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Mission</Text>
            <Text style={styles.metaValue}>
              {formatDate(swap.intervention.date)} · {swap.intervention.startTime}-{swap.intervention.endTime}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{mode === 'mine' ? 'Destinataire' : 'Demandeur'}</Text>
            <Text style={styles.metaValue}>
              {mode === 'mine'
                ? swap.target
                  ? `${swap.target.firstName} ${swap.target.lastName}`
                  : 'Ouvert à tous'
                : `${swap.requester.firstName} ${swap.requester.lastName}`}
            </Text>
          </View>

          {swap.reason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Motif</Text>
              <Text style={styles.reason}>{swap.reason}</Text>
            </View>
          ) : null}

          {swap.status === 'PENDING' && (
            <View style={styles.actionsRow}>
              {mode === 'mine' ? (
                <Button
                  title="Annuler"
                  variant="ghost"
                  size="sm"
                  icon="close-outline"
                  disabled={busyId === swap.id}
                  onPress={() => runAction(swap.id, cancelShiftSwap, 'Demande annulée')}
                />
              ) : (
                <>
                  <Button
                    title="Accepter"
                    size="sm"
                    icon="checkmark-outline"
                    disabled={busyId === swap.id}
                    onPress={() => runAction(swap.id, acceptShiftSwap, 'Échange accepté')}
                  />
                  <Button
                    title="Refuser"
                    variant="ghost"
                    size="sm"
                    icon="close-outline"
                    disabled={busyId === swap.id}
                    onPress={() => runAction(swap.id, rejectShiftSwap, 'Échange refusé')}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <HeaderLayout
      title="Échanges de shift"
      subtitle="Proposez ou répondez à un échange de mission"
      accent="Équipe"
      trailing={
        <View style={styles.headerTrailing}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          {!newRequestFor && (
            <Button title="Nouvelle demande" icon="add-circle-outline" onPress={openPicker} size="sm" />
          )}
        </View>
      }
    >
      {isPickerOpen ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardHeaderText}>Choisir une mission</Text>
          </View>
          {isLoadingEligible ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : eligibleInterventions.length === 0 ? (
            <Text style={styles.cardSubtext}>
              Aucune mission planifiée et non démarrée cette semaine à proposer en échange.
            </Text>
          ) : (
            <View style={styles.list}>
              {eligibleInterventions.map((intervention) => (
                <TouchableOpacity
                  key={intervention.id}
                  style={styles.pickerRow}
                  onPress={() => pickIntervention(intervention)}
                >
                  <View>
                    <Text style={styles.pickerRowTitle}>{intervention.siteName}</Text>
                    <Text style={styles.cardSubtext}>
                      {formatDate(intervention.date)} · {intervention.startTime}-{intervention.endTime}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Button title="Annuler" variant="ghost" onPress={() => setPickerOpen(false)} fullWidth />
        </View>
      ) : null}

      {newRequestFor ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardHeaderText}>Proposer un échange</Text>
          </View>
          {newRequestFor.siteName || newRequestFor.date ? (
            <Text style={styles.cardSubtext}>
              {newRequestFor.siteName ?? ''}
              {newRequestFor.date ? ` · ${formatDate(newRequestFor.date)}` : ''}
              {newRequestFor.startTime ? ` · ${newRequestFor.startTime}-${newRequestFor.endTime}` : ''}
            </Text>
          ) : null}

          <Text style={styles.fieldLabel}>Destinataire</Text>
          <TouchableOpacity
            style={[styles.chip, !selectedTarget && styles.chipSelected, styles.chipStandalone]}
            onPress={() => {
              setSelectedTarget(null);
              setColleagueSearch('');
              setColleagueResults([]);
            }}
          >
            <Text style={[styles.chipLabel, !selectedTarget && styles.chipLabelSelected]}>Ouvert à tous</Text>
          </TouchableOpacity>

          {selectedTarget ? (
            <View style={styles.selectedTargetRow}>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>
                  {selectedTarget.firstName} {selectedTarget.lastName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTarget(null)}>
                <Ionicons name="close-circle" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Ou rechercher un collègue précis par nom..."
                placeholderTextColor={theme.colors.muted}
                value={colleagueSearch}
                onChangeText={setColleagueSearch}
              />
              {isSearchingColleagues ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : colleagueResults.length > 0 ? (
                <View style={styles.list}>
                  {colleagueResults.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        setSelectedTarget(c);
                        setColleagueSearch('');
                        setColleagueResults([]);
                      }}
                    >
                      <Text style={styles.pickerRowTitle}>
                        {c.firstName} {c.lastName}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : colleagueSearch.trim().length >= 2 ? (
                <Text style={styles.cardSubtext}>Aucun collègue trouvé.</Text>
              ) : null}
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Motif (optionnel)"
            placeholderTextColor={theme.colors.muted}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            title={isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
            icon="send-outline"
            onPress={handleSubmit}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Demandes disponibles</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : forMe.length === 0 ? (
        <Text style={styles.empty}>Aucune demande à traiter pour le moment.</Text>
      ) : (
        <View style={styles.list}>{forMe.map((swap, i) => renderSwap(swap, i, 'forMe'))}</View>
      )}

      <View style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
        <Text style={styles.sectionTitle}>Mes demandes</Text>
      </View>
      {isLoading ? null : mine.length === 0 ? (
        <Text style={styles.empty}>Vous n’avez pas encore proposé d’échange.</Text>
      ) : (
        <View style={styles.list}>{mine.map((swap, i) => renderSwap(swap, i, 'mine'))}</View>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  headerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8ecf2',
  },
  pickerRowTitle: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
    color: theme.colors.ink,
    fontSize: 15,
  },
  cardSubtext: {
    color: theme.colors.muted,
  },
  fieldLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.clay,
    backgroundColor: '#fff',
  },
  chipStandalone: {
    marginBottom: theme.spacing.xs,
  },
  selectedTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  chipSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  chipLabel: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 13,
  },
  chipLabelSelected: {
    color: theme.colors.primary,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 60,
    color: theme.colors.ink,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  list: {
    gap: theme.spacing.md,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    opacity: 0.8,
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.ink,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  metaValue: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  reasonBox: {
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  reasonLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  reason: {
    color: theme.colors.ink,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginBottom: theme.spacing.lg,
  },
});
