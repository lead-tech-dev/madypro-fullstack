import * as ImagePicker from 'expo-image-picker';

const JPEG_QUALITY = 0.3;

/**
 * Ouvre l'appareil photo et retourne l'image capturée en data URI base64,
 * ou null si l'utilisateur annule / refuse la permission caméra.
 *
 * Pas de redimensionnement natif (expo-image-manipulator) : manipulateAsync() plantait
 * l'app sur certains Android juste après la capture, exactement comme allowsEditing
 * avant lui — même symptôme (fermeture brutale, aucune erreur JS), donc même famille de
 * bug (traitement d'image natif instable sur ces appareils). On mise sur une compression
 * JPEG plus agressive à la capture (via l'option quality du picker, déjà éprouvée sans
 * crash) pour garder un payload raisonnable, sans rouvrir cette surface de plantage.
 */
export async function capturePhotoBase64(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: JPEG_QUALITY,
    base64: true,
  });
  if (result.canceled || !result.assets?.length || !result.assets[0].base64) {
    return null;
  }
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
}
