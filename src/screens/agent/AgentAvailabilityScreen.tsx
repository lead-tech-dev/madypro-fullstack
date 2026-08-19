import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Availability,
  AvailabilityType,
  listMyAvailability,
  removeAvailability,
  setAvailability,
} from '@/services/api/availability.api';

const formatDateLabel = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

export default function AgentAvailabilityScreen() {
  const { token } = useAuthContext();
  const { showToast } = useToast();
  const [items, setItems] = React.useState<Availability[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(new Date());
  const [type, setType] = React.useState<AvailabilityType>('UNAVAILABLE');
  const [note, setNote] = React.useState('');
  const [isSaving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listMyAvailability(token);
      setItems(data.sort((a, b) => a.date.localeCompare(b.date)));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const handleSubmit = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await setAvailability(token, date.toISOString().slice(0, 10), type, note.trim() || undefined);
      setNote('');
      await load();
    } catch (error: any) {
      showToast('Erreur', error?.message ?? "Impossible d'enregistrer cette disponibilité.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!token) return;
    try {
      await removeAvailability(token, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      showToast('Erreur', 'Impossible de supprimer cette entrée.', 'error');
    }
  };

  return (
    <HeaderLayout title="Mes disponibilités" subtitle="Déclarez vos jours disponibles ou indisponibles" accent="Planning">
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.ink} />
          <Text style={styles.sectionTitle}>Nouvelle déclaration</Text>
        </View>
        <View style={styles.typeRow}>
          {(['UNAVAILABLE', 'AVAILABLE'] as AvailabilityType[]).map((option) => {
            const active = type === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setType(option)}
              >
                <Text style={[styles.typeChipLabel, active && styles.typeChipLabelActive]}>
                  {option === 'AVAILABLE' ? 'Disponible' : 'Indisponible'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen(true)}>
          <View style={styles.dateLabelRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.dateLabel}>Date</Text>
          </View>
          <Text style={styles.dateValue}>{formatDateLabel(date.toISOString())}</Text>
        </TouchableOpacity>
        {pickerOpen && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_event, selectedDate) => {
              if (Platform.OS !== 'ios') setPickerOpen(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
        {pickerOpen && Platform.OS === 'ios' && (
          <Button
            title="Valider la date"
            variant="ghost"
            icon="checkmark-circle-outline"
            onPress={() => setPickerOpen(false)}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Note (optionnel)"
          placeholderTextColor={theme.colors.muted}
          value={note}
          onChangeText={setNote}
        />
        <Button
          title={isSaving ? 'Enregistrement…' : 'Enregistrer'}
          icon="checkmark-circle-outline"
          onPress={handleSubmit}
          disabled={isSaving}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.ink} />
          <Text style={styles.sectionTitle}>Déclarations à venir</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : items.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.muted} />
            <Text style={styles.empty}>Aucune disponibilité déclarée.</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDate}>{formatDateLabel(item.date)}</Text>
                <View style={styles.itemTypeRow}>
                  <Ionicons
                    name={item.type === 'AVAILABLE' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={14}
                    color={item.type === 'AVAILABLE' ? theme.colors.status.onTime : theme.colors.status.absent}
                  />
                  <Text style={[styles.itemType, item.type === 'AVAILABLE' ? styles.itemTypeAvailable : styles.itemTypeUnavailable]}>
                    {item.type === 'AVAILABLE' ? 'Disponible' : 'Indisponible'}
                  </Text>
                </View>
                {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
              </View>
              <Button title="Retirer" variant="ghost" size="sm" icon="trash-outline" onPress={() => handleRemove(item.id)} />
            </View>
          ))
        )}
      </View>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.ink,
    fontSize: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  typeChip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.clay,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  typeChipLabel: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
  },
  typeChipLabelActive: {
    color: '#fff',
  },
  dateField: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dateValue: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    color: theme.colors.ink,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.clay,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  itemDate: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
    textTransform: 'capitalize',
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemType: {
    fontSize: 12,
    fontFamily: theme.fonts.bodySemiBold,
  },
  itemTypeAvailable: {
    color: theme.colors.status.onTime,
  },
  itemTypeUnavailable: {
    color: theme.colors.status.absent,
  },
  itemNote: {
    color: theme.colors.muted,
    marginTop: 4,
  },
});
