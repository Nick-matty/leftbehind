export interface AirlineInfo {
  id: string;
  name: string;
  carryOn: string;
  checked: string;
  weightKg: number;
  restricted: string[];
}

export const AIRLINES: AirlineInfo[] = [
  {
    id: 'emirates',
    name: 'Emirates',
    carryOn: '7 kg · 55×38×20 cm',
    checked: 'Economy 30 kg (2 pcs) · Business 40 kg',
    weightKg: 30,
    restricted: ['Liquids >100ml in cabin', 'Power banks in checked bags', 'Lithium batteries >160Wh'],
  },
  {
    id: 'qatar',
    name: 'Qatar Airways',
    carryOn: '7 kg · 50×37×25 cm',
    checked: 'Economy 30 kg · Business 40 kg',
    weightKg: 30,
    restricted: ['Sharp objects in cabin', 'Flammable liquids', 'Hoverboards'],
  },
  {
    id: 'klm',
    name: 'KLM',
    carryOn: '12 kg · 55×35×25 cm + personal item',
    checked: 'Economy Light: 0 · Standard: 23 kg',
    weightKg: 23,
    restricted: ['E-cigarettes in checked bags', 'Spare lithium batteries in hold'],
  },
  {
    id: 'delta',
    name: 'Delta',
    carryOn: '1 bag + personal item (size limits apply)',
    checked: 'Domestic often 23 kg first bag (fees vary)',
    weightKg: 23,
    restricted: ['Self-defense sprays', 'Fireworks', 'Camping fuel'],
  },
  {
    id: 'turkish',
    name: 'Turkish Airlines',
    carryOn: '8 kg · 55×40×23 cm',
    checked: 'Economy 23–30 kg depending on route',
    weightKg: 23,
    restricted: ['Liquids over 100ml cabin', 'Tools over 6cm cabin'],
  },
  {
    id: 'ethiopian',
    name: 'Ethiopian Airlines',
    carryOn: '7 kg · 55×40×23 cm',
    checked: 'Economy 2×23 kg on many routes',
    weightKg: 23,
    restricted: ['Power banks in checked baggage', 'Corrosives'],
  },
  {
    id: 'ryanair',
    name: 'Ryanair',
    carryOn: 'Small bag under seat free · Priority cabin bag paid',
    checked: '10–20 kg options (paid)',
    weightKg: 20,
    restricted: ['Oversized cabin bags without Priority', 'Sports equipment fees'],
  },
  {
    id: 'airbnb-none',
    name: 'No airline / road trip',
    carryOn: 'N/A',
    checked: 'N/A',
    weightKg: 999,
    restricted: [],
  },
];

export function getAirline(id: string) {
  return AIRLINES.find((a) => a.id === id);
}

export function baggageWarning(estimatedKg: number, airline: AirlineInfo) {
  if (airline.weightKg >= 900) return null;
  if (estimatedKg <= airline.weightKg) {
    return {
      level: 'ok' as const,
      message: `Estimated ${estimatedKg}kg is within ${airline.name}'s ${airline.weightKg}kg allowance.`,
    };
  }
  return {
    level: 'over' as const,
    message: `Your luggage is estimated at ${estimatedKg}kg. ${airline.name} allows ${airline.weightKg}kg.`,
  };
}
