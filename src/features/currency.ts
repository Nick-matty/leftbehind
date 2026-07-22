/** Offline snapshot rates vs USD. Refresh when online if you add a live API later. */
export const RATES_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151,
  CNY: 7.2,
  INR: 83,
  AED: 3.67,
  KES: 129,
  TZS: 2650,
  ZAR: 18.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  TRY: 32,
  BRL: 5.1,
  MXN: 17.2,
  THB: 36,
  IDR: 15800,
  VND: 25000,
};

export const CURRENCY_META: Record<
  string,
  { name: string; symbol: string; tipping: string; typicalMeal: string }
> = {
  USD: { name: 'US Dollar', symbol: '$', tipping: '15–20% in restaurants', typicalMeal: '$12–25 casual meal' },
  EUR: { name: 'Euro', symbol: '€', tipping: 'Round up or 5–10%', typicalMeal: '€10–20 casual meal' },
  GBP: { name: 'British Pound', symbol: '£', tipping: '10–15% if not included', typicalMeal: '£12–20 casual meal' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', tipping: '5–10% in tourist spots', typicalMeal: 'TSh 15,000–40,000' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', tipping: '10% appreciated', typicalMeal: 'KSh 800–2,000' },
  AED: { name: 'UAE Dirham', symbol: 'AED', tipping: 'Service often included; +5–10% optional', typicalMeal: 'AED 40–80' },
  JPY: { name: 'Japanese Yen', symbol: '¥', tipping: 'Tipping not customary', typicalMeal: '¥1,000–2,000' },
  THB: { name: 'Thai Baht', symbol: '฿', tipping: 'Round up / small tip', typicalMeal: '฿80–250' },
};

export function convert(amount: number, from: string, to: string) {
  const a = RATES_USD[from];
  const b = RATES_USD[to];
  if (!a || !b) return null;
  return (amount / a) * b;
}

export function currencyForCountry(country: string): string {
  const c = country.toLowerCase();
  if (c.includes('tanzania') || c.includes('zanzibar')) return 'TZS';
  if (c.includes('kenya')) return 'KES';
  if (c.includes('uae') || c.includes('dubai') || c.includes('emirates')) return 'AED';
  if (c.includes('japan')) return 'JPY';
  if (c.includes('thailand')) return 'THB';
  if (c.includes('uk') || c.includes('united kingdom') || c.includes('england')) return 'GBP';
  if (c.includes('euro') || c.includes('france') || c.includes('germany') || c.includes('italy') || c.includes('spain')) return 'EUR';
  return 'USD';
}
