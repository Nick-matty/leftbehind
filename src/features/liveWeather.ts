/** Live weather via Open-Meteo (no API key). Location via browser geolocation / expo-location. */

import { Platform } from 'react-native';

export type WeatherIconKey =
  | 'sunny'
  | 'clearNight'
  | 'partlyCloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

export interface LiveWeather {
  city: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmh: number;
  highC: number;
  lowC: number;
  condition: string;
  icon: WeatherIconKey;
  isDay: boolean;
  fetchedAt: number;
}

const FALLBACK = {
  city: 'Your area',
  latitude: -6.16,
  longitude: 39.2,
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function conditionFromCode(code: number, isDay: boolean): { condition: string; icon: WeatherIconKey } {
  if (code === 0) return { condition: isDay ? 'Clear' : 'Clear night', icon: isDay ? 'sunny' : 'clearNight' };
  if (code <= 2) return { condition: 'Partly cloudy', icon: 'partlyCloudy' };
  if (code === 3) return { condition: 'Cloudy', icon: 'cloudy' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'fog' };
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: 'drizzle' };
  if (code >= 61 && code <= 67) return { condition: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', icon: 'rain' };
  if (code >= 85 && code <= 86) return { condition: 'Snow showers', icon: 'snow' };
  if (code >= 95) return { condition: 'Thunderstorm', icon: 'thunder' };
  return { condition: 'Fair', icon: isDay ? 'sunny' : 'clearNight' };
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; region?: string; country?: string }> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await withTimeout(fetch(url), 4000);
    if (!res.ok) throw new Error('geocode failed');
    const data = await res.json();
    const country =
      data.countryCode === 'TZ'
        ? 'Tanzania'
        : data.countryName?.replace(/^the\s+/i, '').split(',')[0] || data.countryName;
    return {
      city: data.city || data.locality || data.principalSubdivision || FALLBACK.city,
      region: data.principalSubdivision,
      country,
    };
  } catch {
    return { city: FALLBACK.city };
  }
}

async function browserCoords(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    // Chrome's geolocation `timeout` only starts AFTER permission is granted,
    // so a pending prompt would hang forever without this outer race.
    const pos = await withTimeout(
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 600000,
        });
      }),
      3500
    );
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

async function nativeCoords(): Promise<{ latitude: number; longitude: number } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = await import('expo-location');
    const { status } = await withTimeout(Location.requestForegroundPermissionsAsync(), 3000);
    if (status !== 'granted') return null;
    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      5000
    );
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

async function getCoords(): Promise<{ latitude: number; longitude: number }> {
  // Prefer quick browser geolocation on web; never block the UI for long.
  const fromBrowser = await browserCoords();
  if (fromBrowser) return fromBrowser;
  const fromNative = await nativeCoords();
  if (fromNative) return fromNative;
  return { latitude: FALLBACK.latitude, longitude: FALLBACK.longitude };
}

async function forecastAt(
  latitude: number,
  longitude: number,
  place?: { city: string; region?: string; country?: string }
): Promise<LiveWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;

  const res = await withTimeout(fetch(url), 8000);
  if (!res.ok) throw new Error('weather fetch failed');
  const data = await res.json();
  const cur = data.current;
  if (!cur) throw new Error('weather missing current');
  const isDay = cur.is_day === 1;
  const { condition, icon } = conditionFromCode(Number(cur.weather_code), isDay);
  const resolved = place ?? (await reverseGeocode(latitude, longitude));

  return {
    city: resolved.city,
    region: resolved.region,
    country: resolved.country,
    latitude,
    longitude,
    tempC: Math.round(cur.temperature_2m),
    feelsLikeC: Math.round(cur.apparent_temperature),
    humidity: Math.round(cur.relative_humidity_2m),
    windKmh: Math.round(cur.wind_speed_10m),
    highC: Math.round(data.daily?.temperature_2m_max?.[0] ?? cur.temperature_2m),
    lowC: Math.round(data.daily?.temperature_2m_min?.[0] ?? cur.temperature_2m),
    condition,
    icon,
    isDay,
    fetchedAt: Date.now(),
  };
}

/** Live weather for the device location (Open-Meteo, no API key). */
export async function fetchLiveWeather(): Promise<LiveWeather> {
  const { latitude, longitude } = await getCoords();
  return forecastAt(latitude, longitude);
}

/** Geocode a place name and fetch a short live forecast. */
export async function fetchLiveWeatherForPlace(query: string): Promise<LiveWeather | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
      `&count=1&language=en&format=json`;
    const geoRes = await withTimeout(fetch(geoUrl), 6000);
    if (!geoRes.ok) return null;
    const geo = await geoRes.json();
    const hit = geo?.results?.[0];
    if (!hit) return null;
    return forecastAt(Number(hit.latitude), Number(hit.longitude), {
      city: hit.name || q,
      region: hit.admin1,
      country: hit.country,
    });
  } catch {
    return null;
  }
}

export function formatLiveWeatherReply(w: LiveWeather, daysHint = false): string {
  const where = [w.city, w.country].filter(Boolean).join(', ');
  const base =
    `Live weather for ${where}: ${w.condition}, ${w.tempC}°C (feels like ${w.feelsLikeC}°C). ` +
    `Humidity ${w.humidity}%, wind ${w.windKmh} km/h. High ${w.highC}°C / low ${w.lowC}°C.`;
  return daysHint
    ? `${base} (Open-Meteo live forecast — ask again anytime for an update.)`
    : base;
}

/** Safe MaterialIcons names for each condition. */
export function weatherMaterialIcon(
  icon: LiveWeather['icon']
): keyof typeof import('@expo/vector-icons').MaterialIcons.glyphMap {
  const map: Record<
    LiveWeather['icon'],
    keyof typeof import('@expo/vector-icons').MaterialIcons.glyphMap
  > = {
    sunny: 'wb-sunny',
    clearNight: 'nights-stay',
    partlyCloudy: 'wb-cloudy',
    cloudy: 'cloud',
    fog: 'filter-drama',
    drizzle: 'grain',
    rain: 'beach-access',
    snow: 'ac-unit',
    thunder: 'flash-on',
  };
  return map[icon];
}
