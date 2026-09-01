import { useState } from 'react';
import { distanceInMeters } from '../utils/location';

export const useLocationCheck = () => {
  const [distance, setDistance] = useState<number | null>(null);

  const check = (currentLat: number, currentLon: number, targetLat: number, targetLon: number) => {
    const delta = distanceInMeters(
      { latitude: currentLat, longitude: currentLon },
      { latitude: targetLat, longitude: targetLon },
    );
    setDistance(delta);
    return delta < 100;
  };

  return { distance, check };
};
