import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/config/theme';

type PhotoGridProps = {
  photos: string[];
  onAddPhoto: () => Promise<void> | void;
  onRemovePhoto: (uri: string) => void;
  disabled?: boolean;
};

/**
 * Grille de photos réutilisable : miniatures avec bouton de suppression, tuile d'ajout à la fin,
 * et agrandissement en plein écran au tap — même comportement partout où des photos sont prises
 * dans l'app (signalement de problème, checklist, ...), miroir du composant web équivalent.
 */
export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onAddPhoto, onRemovePhoto, disabled }) => {
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  return (
    <>
      <View style={styles.grid}>
        {photos.map((uri) => (
          <View key={uri} style={styles.item}>
            <TouchableOpacity onPress={() => setLightboxUri(uri)} activeOpacity={0.85}>
              <Image source={{ uri }} style={styles.photo} />
            </TouchableOpacity>
            {!disabled && (
              <TouchableOpacity style={styles.remove} onPress={() => onRemovePhoto(uri)} hitSlop={8}>
                <Text style={styles.removeLabel}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {!disabled && (
          <TouchableOpacity style={styles.add} onPress={onAddPhoto} accessibilityLabel="Ajouter une photo">
            <Text style={styles.addLabel}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={Boolean(lightboxUri)} animationType="fade" transparent onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={styles.lightboxOverlay} onPress={() => setLightboxUri(null)}>
          {lightboxUri && <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  item: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.md,
  },
  remove: {
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
  removeLabel: {
    color: '#fff',
    fontWeight: '700',
    lineHeight: 16,
  },
  add: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 28,
    lineHeight: 28,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '90%',
    height: '80%',
  },
});
