export type Activity =
  | 'beach'
  | 'hiking'
  | 'business'
  | 'wedding'
  | 'city'
  | 'camping'
  | 'winter';

export type GenderHint = 'male' | 'female' | 'unspecified';

export interface PackingContext {
  destination: string;
  country?: string;
  days: number;
  month?: number; // 1-12
  activities?: Activity[];
  gender?: GenderHint;
  avgTempC?: number;
  rainy?: boolean;
}

export interface PackSuggestion {
  id: string;
  label: string;
  reason: string;
  category: string;
  priority: 'must' | 'recommended' | 'optional';
}

const ACTIVITY_ITEMS: Record<Activity, PackSuggestion[]> = {
  beach: [
    { id: 'swimwear', label: 'Swimwear', reason: 'Beach days', category: 'Clothing', priority: 'must' },
    { id: 'sandals', label: 'Sandals', reason: 'Beach / warm weather', category: 'Clothing', priority: 'must' },
    { id: 'sunscreen', label: 'Sunscreen SPF 50', reason: 'Strong sun exposure', category: 'Health', priority: 'must' },
    { id: 'sunglasses', label: 'Sunglasses', reason: 'Bright coastal light', category: 'Personal', priority: 'must' },
    { id: 'mosquito', label: 'Mosquito repellent', reason: 'Tropical evenings', category: 'Health', priority: 'recommended' },
  ],
  hiking: [
    { id: 'boots', label: 'Hiking boots', reason: 'Trail footing', category: 'Clothing', priority: 'must' },
    { id: 'rain-jacket', label: 'Rain jacket', reason: 'Changeable weather', category: 'Clothing', priority: 'recommended' },
    { id: 'water-bottle', label: 'Water bottle', reason: 'Hydration on trails', category: 'Personal', priority: 'must' },
    { id: 'first-aid', label: 'First-aid kit', reason: 'Outdoor safety', category: 'Health', priority: 'recommended' },
  ],
  business: [
    { id: 'formal', label: 'Formal outfit', reason: 'Meetings / events', category: 'Clothing', priority: 'must' },
    { id: 'laptop', label: 'Laptop + charger', reason: 'Work on the road', category: 'Electronics', priority: 'must' },
    { id: 'adapter', label: 'Travel adapter', reason: 'Foreign outlets', category: 'Electronics', priority: 'must' },
  ],
  wedding: [
    { id: 'dress-code', label: 'Dress-code outfit', reason: 'Ceremony attire', category: 'Clothing', priority: 'must' },
    { id: 'gift', label: 'Gift / card', reason: 'Wedding etiquette', category: 'Personal', priority: 'recommended' },
    { id: 'shoes', label: 'Dress shoes', reason: 'Formal footwear', category: 'Clothing', priority: 'must' },
  ],
  city: [
    { id: 'comfortable-shoes', label: 'Comfortable walking shoes', reason: 'City exploring', category: 'Clothing', priority: 'must' },
    { id: 'daypack', label: 'Daypack', reason: 'Daily essentials', category: 'Personal', priority: 'recommended' },
  ],
  camping: [
    { id: 'sleeping-bag', label: 'Sleeping bag', reason: 'Overnight camping', category: 'Gear', priority: 'must' },
    { id: 'headlamp', label: 'Headlamp', reason: 'Camp nights', category: 'Gear', priority: 'must' },
    { id: 'multi-tool', label: 'Multi-tool', reason: 'Camp chores', category: 'Gear', priority: 'recommended' },
  ],
  winter: [
    { id: 'heavy-coat', label: 'Heavy coat', reason: 'Cold climate', category: 'Clothing', priority: 'must' },
    { id: 'gloves', label: 'Gloves + scarf', reason: 'Winter layers', category: 'Clothing', priority: 'must' },
    { id: 'thermal', label: 'Thermal base layers', reason: 'Insulation', category: 'Clothing', priority: 'recommended' },
  ],
};

const TROPICAL_DEST_HINTS = [
  'zanzibar', 'maldives', 'bali', 'phuket', 'hawaii', 'caribbean', 'mauritius',
  'seychelles', 'cancun', 'aruba', 'fiji', 'thailand', 'kenya', 'tanzania',
];

export function suggestPacking(ctx: PackingContext): { summary: string; items: PackSuggestion[] } {
  const dest = ctx.destination.trim();
  const month = ctx.month ?? new Date().getMonth() + 1;
  const activities = ctx.activities?.length ? ctx.activities : inferActivities(dest, month, ctx.avgTempC);
  const map = new Map<string, PackSuggestion>();

  const base: PackSuggestion[] = [
    { id: 'passport', label: 'Passport / ID', reason: 'Travel documents', category: 'Documents', priority: 'must' },
    { id: 'phone-charger', label: 'Phone charger', reason: 'Most forgotten item', category: 'Electronics', priority: 'must' },
    { id: 'meds', label: 'Personal medication', reason: 'Health continuity', category: 'Health', priority: 'must' },
    { id: 'toiletries', label: 'Toiletries kit', reason: 'Daily hygiene', category: 'Bathroom', priority: 'must' },
    {
      id: 'clothes-days',
      label: `${Math.min(ctx.days + 1, 10)}× underwear & socks`,
      reason: `${ctx.days}-day trip`,
      category: 'Clothing',
      priority: 'must',
    },
  ];

  for (const item of base) map.set(item.id, item);

  for (const act of activities) {
    for (const item of ACTIVITY_ITEMS[act] ?? []) map.set(item.id, item);
  }

  for (const item of weatherItems(ctx)) map.set(item.id, item);

  if (ctx.gender === 'female') {
    map.set('hair-care', {
      id: 'hair-care',
      label: 'Hair care essentials',
      reason: 'Personal preference',
      category: 'Bathroom',
      priority: 'optional',
    });
  }

  const items = Array.from(map.values()).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  const highlights = items.filter((i) => i.priority === 'must').slice(0, 6).map((i) => i.label.toLowerCase());
  const activityLabel = activities.join(', ') || 'general travel';
  const summary = dest
    ? `You're going to ${dest} for ${ctx.days} day${ctx.days === 1 ? '' : 's'}${monthName(month) ? ` in ${monthName(month)}` : ''}. Focus on ${activityLabel}. Don't forget ${highlights.join(', ')}.`
    : `Pack for a ${ctx.days}-day trip. Don't forget ${highlights.join(', ')}.`;

  return { summary, items };
}

function inferActivities(destination: string, month: number, avgTempC?: number): Activity[] {
  const d = destination.toLowerCase();
  const acts: Activity[] = ['city'];
  if (TROPICAL_DEST_HINTS.some((h) => d.includes(h))) acts.push('beach');
  if (avgTempC != null && avgTempC <= 8) acts.push('winter');
  if ((month >= 11 || month <= 2) && !TROPICAL_DEST_HINTS.some((h) => d.includes(h))) {
    if (!acts.includes('winter')) acts.push('winter');
  }
  return acts;
}

export function weatherItems(ctx: PackingContext): PackSuggestion[] {
  const items: PackSuggestion[] = [];
  const temp = ctx.avgTempC;
  if (ctx.rainy || (temp != null && temp < 18 && (ctx.month ?? 0) >= 10)) {
    items.push({
      id: 'umbrella',
      label: 'Umbrella / rain shell',
      reason: 'Wet forecast or season',
      category: 'Clothing',
      priority: 'recommended',
    });
  }
  if (temp != null && temp < 12) {
    items.push(
      { id: 'jacket', label: 'Warm jacket', reason: `Cool ~${temp}°C`, category: 'Clothing', priority: 'must' },
      { id: 'boots-weather', label: 'Boots', reason: 'Cold / wet ground', category: 'Clothing', priority: 'recommended' },
    );
  }
  if (temp != null && temp >= 26) {
    items.push(
      { id: 'sunscreen-w', label: 'Sunscreen', reason: `Hot ~${temp}°C`, category: 'Health', priority: 'must' },
      { id: 'hat', label: 'Sun hat', reason: 'High UV', category: 'Clothing', priority: 'recommended' },
    );
  }
  if (temp != null && temp <= 5) {
    items.push({
      id: 'winter-clothes',
      label: 'Full winter layers',
      reason: 'Freezing forecast',
      category: 'Clothing',
      priority: 'must',
    });
  }
  return items;
}

function priorityRank(p: PackSuggestion['priority']) {
  return p === 'must' ? 0 : p === 'recommended' ? 1 : 2;
}

function monthName(m: number) {
  return [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][m] ?? '';
}

export function packingScore(checked: number, total: number, mustMissing = 0): number {
  if (total <= 0) return 0;
  const base = (checked / total) * 100;
  return Math.max(0, Math.min(100, Math.round(base - mustMissing * 4)));
}

/** Rough kg estimate: ~0.35kg per packed clothing/gear item average. */
export function estimateLuggageKg(itemCount: number, days: number) {
  return Math.round((itemCount * 0.35 + days * 0.4) * 10) / 10;
}
