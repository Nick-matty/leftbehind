export interface LocalGuide {
  id: string;
  destination: string;
  country: string;
  bestFood: string[];
  attractions: string[];
  safetyTips: string[];
  customs: string[];
  transport: string[];
  emergency: { police: string; ambulance: string; general: string };
}

export const GUIDES: LocalGuide[] = [
  {
    id: 'zanzibar',
    destination: 'Zanzibar',
    country: 'Tanzania',
    bestFood: ['Zanzibar pizza', 'Fresh seafood', 'Urojo soup', 'Coconut rice'],
    attractions: ['Stone Town', 'Nungwi Beach', 'Spice farms', 'Prison Island'],
    safetyTips: ['Use registered taxis at night', 'Drink bottled water', 'Respect local dress in Stone Town'],
    customs: ['Greet with “Jambo”', 'Ask before photographing people', 'Dress modestly near mosques'],
    transport: ['Daladala minibuses', 'Private taxi / bajaji', 'Ferries to mainland'],
    emergency: { police: '112', ambulance: '114', general: '112' },
  },
  {
    id: 'dubai',
    destination: 'Dubai',
    country: 'UAE',
    bestFood: ['Shawarma', 'Al Harees', 'Brunch buffets', 'Luqaimat'],
    attractions: ['Burj Khalifa', 'Dubai Mall', 'Desert safari', 'Old Dubai creek'],
    safetyTips: ['Very safe overall', 'Follow dress codes in malls/mosques', 'Never drink and drive'],
    customs: ['Right hand for greetings/eating', 'Public affection limited', 'Ramadan sensitivity'],
    transport: ['Metro', 'Careem / Uber', 'Tram & buses'],
    emergency: { police: '999', ambulance: '998', general: '999' },
  },
  {
    id: 'paris',
    destination: 'Paris',
    country: 'France',
    bestFood: ['Croissants', 'Steak-frites', 'Crêpes', 'Cheese boards'],
    attractions: ['Louvre', 'Eiffel Tower', 'Montmartre', 'Seine walk'],
    safetyTips: ['Watch for pickpockets on metro', 'Keep bags zipped', 'Avoid unlicensed taxis'],
    customs: ['Say Bonjour when entering shops', 'Tipping modest', 'Quiet voices in cafés'],
    transport: ['Metro', 'RER', 'Vélib bikes', 'Official taxis'],
    emergency: { police: '17', ambulance: '15', general: '112' },
  },
  {
    id: 'tokyo',
    destination: 'Tokyo',
    country: 'Japan',
    bestFood: ['Ramen', 'Sushi', 'Convenience-store meals', 'Tempura'],
    attractions: ['Shibuya', 'Senso-ji', 'teamLab', 'Meiji Shrine'],
    safetyTips: ['Extremely safe', 'Mind train last services', 'Natural disaster apps useful'],
    customs: ['No tipping', 'Quiet trains', 'Remove shoes indoors when asked'],
    transport: ['JR & subway IC cards', 'IC Suica/Pasmo', 'Taxis'],
    emergency: { police: '110', ambulance: '119', general: '110' },
  },
  {
    id: 'generic',
    destination: 'Your destination',
    country: 'Worldwide',
    bestFood: ['Ask locals for neighborhood favorites', 'Try a morning market'],
    attractions: ['Old town / historic center', 'Main museum', 'City viewpoint'],
    safetyTips: ['Share live location with family', 'Keep digital copies of documents', 'Know embassy contacts'],
    customs: ['Learn hello & thank you', 'Observe local dress norms', 'Ask before photos'],
    transport: ['Official airport taxis', 'City transit card', 'Walking for short hops'],
    emergency: { police: 'Local emergency number', ambulance: 'Local emergency number', general: '112 / 911' },
  },
];

export function findGuide(destination: string, country?: string): LocalGuide {
  const hay = `${destination} ${country ?? ''}`.toLowerCase();
  return (
    GUIDES.find((g) => hay.includes(g.destination.toLowerCase()) || hay.includes(g.id)) ??
    GUIDES[GUIDES.length - 1]
  );
}
