import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { theme } from '../../config/theme';
import { Absence, AbsenceType } from '../../types/absences';
import { submitAbsenceRequest } from '../../services/api/absences.api';

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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<AbsenceType>('SICK');
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!from || !to || !reason.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir les dates et le motif.');
      return;
    }
    setSubmitting(true);
    try {
      const absence = await submitAbsenceRequest(token, {
        userId,
        from,
        to,
        reason: reason.trim(),
        type,
      });
      setFrom('');
      setTo('');
      setReason('');
      setType('SICK');
      onSubmitted?.(absence);
      Alert.alert('Demande envoyée', 'Votre absence est en attente de validation.');
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer la demande pour l'instant.");
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
      <Input
        label="Du"
        value={from}
        onChangeText={setFrom}
        placeholder="2024-03-20"
        keyboardType="numbers-and-punctuation"
      />
      <Input
        label="Au"
        value={to}
        onChangeText={setTo}
        placeholder="2024-03-22"
        keyboardType="numbers-and-punctuation"
      />
      <TextInput
        style={styles.textarea}
        placeholder="Motif ou commentaire"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
      />
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
});
