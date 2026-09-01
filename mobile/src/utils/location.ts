import * as Location from 'expo-location';

const EARTH_RADIUS = 6371000; // meters

export type ProximityCheckResult = {
  ok: boolean;
  distance?: number;
  message?: string;
};

export async function requestForegroundLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentCoordinates() {
  const granted = await requestForegroundLocationPermission();
  if (!granted) {
    throw new Error('Permission refusée');
  }
  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function distanceInMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

export async function verifyProximityToSite(
  latitude?: number,
  longitude?: number,
  maxDistance = 120,
): Promise<ProximityCheckResult> {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      ok: true,
      message: 'Coordonnées indisponibles, validation manuelle',
    };
  }
  try {
    const coords = await getCurrentCoordinates();
    const distance = distanceInMeters(coords, { latitude, longitude });
    return {
      ok: distance <= maxDistance,
      distance,
      message:
        distance <= maxDistance
          ? undefined
          : `Distance mesurée ${Math.round(distance)} m (limite ${maxDistance} m)`,
    };
  } catch (error) {
    return {
      ok: false,
      message: 'Impossible de récupérer la localisation',
    };
  }
}
