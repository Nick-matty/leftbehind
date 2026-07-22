/** Seeded climate / typical weather the assistant can quote offline. Feed more via assistant memory. */

export interface WeatherSnapshot {
  destination: string;
  country: string;
  seasonNote: string;
  avgHighC: number;
  avgLowC: number;
  rainChance: string;
  packingTip: string;
  updatedLabel: string;
}

export const WEATHER_SEED: WeatherSnapshot[] = [
  {
    destination: 'Zanzibar',
    country: 'Tanzania',
    seasonNote: 'Warm tropical climate year-round; July is dry and breezy.',
    avgHighC: 29,
    avgLowC: 22,
    rainChance: 'Low in July',
    packingTip: 'Sunscreen, sandals, light clothes, mosquito repellent.',
    updatedLabel: 'Climate profile · offline seed',
  },
  {
    destination: 'Dubai',
    country: 'UAE',
    seasonNote: 'Hot desert; summers extreme, winters mild.',
    avgHighC: 36,
    avgLowC: 26,
    rainChance: 'Very low',
    packingTip: 'Light breathable clothes, sunscreen, refillable water bottle.',
    updatedLabel: 'Climate profile · offline seed',
  },
  {
    destination: 'Paris',
    country: 'France',
    seasonNote: 'Temperate; pack layers and a light rain shell.',
    avgHighC: 18,
    avgLowC: 10,
    rainChance: 'Moderate',
    packingTip: 'Jacket, comfortable shoes, compact umbrella.',
    updatedLabel: 'Climate profile · offline seed',
  },
  {
    destination: 'Tokyo',
    country: 'Japan',
    seasonNote: 'Four seasons — check month before packing.',
    avgHighC: 22,
    avgLowC: 14,
    rainChance: 'Seasonal (June rainy season)',
    packingTip: 'Layers, compact umbrella, walking shoes.',
    updatedLabel: 'Climate profile · offline seed',
  },
  {
    destination: 'London',
    country: 'UK',
    seasonNote: 'Cool and often cloudy; rain possible any month.',
    avgHighC: 16,
    avgLowC: 9,
    rainChance: 'Frequent light rain',
    packingTip: 'Waterproof jacket, layers, sturdy shoes.',
    updatedLabel: 'Climate profile · offline seed',
  },
];

export function findWeather(destination?: string, country?: string): WeatherSnapshot {
  const hay = `${destination ?? ''} ${country ?? ''}`.toLowerCase();
  return (
    WEATHER_SEED.find(
      (w) => hay.includes(w.destination.toLowerCase()) || hay.includes(w.country.toLowerCase())
    ) ?? {
      destination: destination || 'Your destination',
      country: country || '',
      seasonNote: 'I do not have a detailed forecast seed for this place yet. Teach me with: remember weather …',
      avgHighC: 24,
      avgLowC: 16,
      rainChance: 'Unknown',
      packingTip: 'Pack layers and check a live forecast when online.',
      updatedLabel: 'Generic fallback',
    }
  );
}

export function formatWeatherReply(w: WeatherSnapshot) {
  return (
    `Weather update for ${w.destination}${w.country ? `, ${w.country}` : ''}: ` +
    `${w.seasonNote} Typical highs around ${w.avgHighC}°C and lows ${w.avgLowC}°C. ` +
    `Rain: ${w.rainChance}. Pack tip: ${w.packingTip} (${w.updatedLabel}).`
  );
}
