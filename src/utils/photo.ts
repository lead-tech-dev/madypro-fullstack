import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.5;

/**
 * Ouvre l'appareil photo et retourne l'image capturée en data URI base64,
 * ou null si l'utilisateur annule / refuse la permission caméra.
 *
 * Redimensionne toujours l'image (photo brute d'un capteur récent = plusieurs Mo en base64,
 * trop lent voire fatal à envoyer sur une connexion mobile faible : ça déclenchait un timeout
 * pris à tort pour "hors ligne").
 */
export async function capturePhotoBase64(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync();
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  const asset = result.assets[0];
  const isLandscape = (asset.width ?? 0) >= (asset.height ?? 0);
  const needsResize = (asset.width ?? 0) > MAX_DIMENSION || (asset.height ?? 0) > MAX_DIMENSION;
  const resized = await manipulateAsync(
    asset.uri,
    needsResize ? [{ resize: isLandscape ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION } }] : [],
    { base64: true, compress: JPEG_QUALITY, format: SaveFormat.JPEG },
  );
  if (!resized.base64) {
    return null;
  }
  return `data:image/jpeg;base64,${resized.base64}`;
}
