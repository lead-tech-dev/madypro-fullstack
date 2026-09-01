export type WeatherSnapshot = {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
};

// Open-Meteo : API météo gratuite, sans clé requise.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Plutôt dégagé',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine',
  55: 'Bruine forte',
  61: 'Pluie légère',
  63: 'Pluie',
  65: 'Pluie forte',
  71: 'Neige légère',
  73: 'Neige',
  75: 'Neige forte',
  80: 'Averses',
  81: 'Averses fortes',
  82: 'Averses violentes',
  95: 'Orage',
};

export function describeWeatherCode(code: number) {
  return WEATHER_CODE_LABELS[code] ?? 'Conditions variables';
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherSnapshot | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const current = json?.current;
    if (!current) return null;
    return {
      temperatureC: Math.round(current.temperature_2m),
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
    };
  } catch {
    return null;
  }
}
