/** Refresh offline FX snapshot from Frankfurter (ECB) when online — no API key. */

import { RATES_USD } from './currency';

let lastFetch = 0;
const CACHE_MS = 6 * 60 * 60 * 1000;

export async function refreshRatesIfStale(): Promise<Record<string, number> | null> {
  if (Date.now() - lastFetch < CACHE_MS) return null;
  try {
    const codes = Object.keys(RATES_USD).filter((c) => c !== 'USD').join(',');
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${codes}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.rates || typeof data.rates !== 'object') return null;
    const next: Record<string, number> = { USD: 1 };
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === 'number' && Number.isFinite(rate)) next[code] = rate;
    }
    Object.assign(RATES_USD, next);
    lastFetch = Date.now();
    return next;
  } catch {
    return null;
  }
}
