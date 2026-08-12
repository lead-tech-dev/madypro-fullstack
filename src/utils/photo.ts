import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

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
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}
