import React from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { AnomalyType } from '@/types/anomaly';

export const ANOMALY_OPTIONS: Array<{ value: AnomalyType; label: string }> = [
  { value: 'CLEANLINESS', label: 'Propreté' },
  { value: 'MISSING_SUPPLIES', label: 'Matériel manquant' },
  { value: 'ACCESS', label: 'Accès impossible' },
  { value: 'DAMAGE', label: 'Dégâts' },
  { value: 'OTHER', label: 'Autre' },
];

type ProblemModalProps = {
  visible: boolean;
  onClose: () => void;
  type: AnomalyType;
  onTypeChange: (type: AnomalyType) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  photos: string[];
  onAddPhoto: () => Promise<void>;
  onRemovePhoto: (uri: string) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
};

export const ProblemModal: React.FC<ProblemModalProps> = ({
  visible,
  onClose,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  photos,
  onAddPhoto,
  onRemovePhoto,
  onSubmit,
  submitting,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Signaler un problème</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonLabel}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.modalLabel}>Type d'anomalie</Text>
        <View style={styles.typeOptions}>
          {ANOMALY_OPTIONS.map((option) => {
            const active = option.value === type;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.typePill, active && styles.typePillActive]}
                onPress={() => onTypeChange(option.value)}
              >
                <Text style={[styles.typePillLabel, active && styles.typePillLabelActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.modalLabel}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Décrivez le problème rencontré…"
          placeholderTextColor={theme.colors.muted}
          multiline
          value={description}
          onChangeText={onDescriptionChange}
        />
        <Text style={styles.modalLabel}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri) => (
            <View key={uri} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => onRemovePhoto(uri)}
              >
                <Text style={styles.photoRemoveLabel}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addPhoto} onPress={onAddPhoto}>
            <Text style={styles.addPhotoLabel}>Ajouter une photo</Text>
          </TouchableOpacity>
        </View>
        <Button
          title={submitting ? 'Envoi…' : 'Envoyer'}
          onPress={onSubmit}
          disabled={submitting}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bodyBold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonLabel: {
    fontSize: 20,
    color: theme.colors.ink,
  },
  modalLabel: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typePill: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.clay,
  },
  typePillActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  typePillLabel: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.bodySemiBold,
  },
  typePillLabelActive: {
    color: theme.colors.primary,
  },
  textArea: {
    minHeight: 120,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.clay,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
    color: theme.colors.ink,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.md,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  addPhoto: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addPhotoLabel: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
});
