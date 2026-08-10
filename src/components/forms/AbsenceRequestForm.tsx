import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '../ui/Button';
import { theme } from '../../config/theme';
import { Absence, AbsenceType } from '../../types/absences';
import { submitAbsenceRequest } from '../../services/api/absences.api';
import { capturePhotoBase64 } from '../../utils/photo';

const toDateString = (date: Date) => date.toISOString().slice(0, 10);
const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

type Props = {
  token: string;
  userId: string;
  onSubmitted?: (absence: Absence) => void;
};

const ABSENCE_OPTIONS: Array<{ value: AbsenceType; label: string }> = [
  { value: 'SICK', label: 'Maladie' },
  { value: 'PAID_LEAVE', label: 'Congés payés' },
  { value: 'UNPAID', label: 'Congés sans solde' },
  { value: 'OTHER', label: 'Autre' },
];

export const AbsenceRequestForm: React.FC<Props> = ({ token, userId, onSubmitted }) => {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);
  const [reason, setReason] = useState('');
  const [type, setType] = useState<AbsenceType>('SICK');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleAttach = async () => {
    const photo = await capturePhotoBase64();
    if (photo) setAttachment(photo);
  };

  const handleSubmit = async () => {
    if (!from || !to || !reason.trim()) {
      Alert.alert('Champs requis', 'Veuillez choisir les dates et indiquer le motif.');
      return;
    }
    if (from > to) {
      Alert.alert('Dates invalides', 'La date de début doit précéder la date de fin.');
      return;
    }
    setSubmitting(true);
    try {
      const absence = await submitAbsenceRequest(token, {
        userId,
        from: toDateString(from),
        to: toDateString(to),
        reason: reason.trim(),
        type,
        attachment: attachment ?? undefined,
      });
      setFrom(null);
      setTo(null);
      setReason('');
      setType('SICK');
      setAttachment(null);
      onSubmitted?.(absence);
      Alert.alert('Demande envoyée', 'Votre absence est en attente de validation.');
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer la demande pour l'instant.";
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.optionRow}>
        {ABSENCE_OPTIONS.map((option) => {
          const active = option.value === type;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setType(option.value)}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen('from')}>
        <Text style={styles.dateLabel}>Du</Text>
        <Text style={styles.dateValue}>{from ? formatDateLabel(from) : 'Choisir une date'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen('to')}>
        <Text style={styles.dateLabel}>Au</Text>
        <Text style={styles.dateValue}>{to ? formatDateLabel(to) : 'Choisir une date'}</Text>
      </TouchableOpacity>
      {pickerOpen && (
        <DateTimePicker
          value={(pickerOpen === 'from' ? from : to) ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={pickerOpen === 'to' ? from ?? undefined : undefined}
          onChange={(_event, selectedDate) => {
            if (Platform.OS !== 'ios') setPickerOpen(null);
            if (!selectedDate) return;
            if (pickerOpen === 'from') {
              setFrom(selectedDate);
              if (to && selectedDate > to) setTo(selectedDate);
            } else {
              setTo(selectedDate);
            }
          }}
        />
      )}
      {pickerOpen === 'from' && Platform.OS === 'ios' && (
        <Button title="Valider la date" variant="ghost" onPress={() => setPickerOpen(null)} />
      )}
      {pickerOpen === 'to' && Platform.OS === 'ios' && (
        <Button title="Valider la date" variant="ghost" onPress={() => setPickerOpen(null)} />
      )}
      <TextInput
        style={styles.textarea}
        placeholder="Motif ou commentaire"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
      />
      <View style={styles.attachmentRow}>
        {attachment ? (
          <>
            <Image source={{ uri: attachment }} style={styles.attachmentThumb} />
            <TouchableOpacity onPress={() => setAttachment(null)}>
              <Text style={styles.attachmentRemove}>Retirer le justificatif</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={handleAttach}>
            <Text style={styles.attachmentAdd}>+ Joindre un justificatif (facultatif)</Text>
          </TouchableOpacity>
        )}
      </View>
      <Button title={isSubmitting ? 'Envoi…' : 'Envoyer la demande'} onPress={handleSubmit} disabled={isSubmitting} />
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.md,
  },
  textarea: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.shell,
  },
  dateField: {
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.shell,
  },
  dateLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateValue: {
    marginTop: 4,
    color: theme.colors.ink,
    fontFamily: theme.fonts.bodySemiBold,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  option: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.shell,
  },
  optionActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  optionLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.md,
  },
  attachmentAdd: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
  attachmentRemove: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.bodySemiBold,
  },
});
