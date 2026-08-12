import * as ImagePicker from 'expo-image-picker';

/**
 * Ouvre l'appareil photo et retourne l'image capturée en data URI base64,
 * ou null si l'utilisateur annule / refuse la permission caméra.
 */
export async function capturePhotoBase64(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.5,
    base64: true,
  });
  if (result.canceled || !result.assets?.length || !result.assets[0].base64) {
    return null;
  }
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
}
