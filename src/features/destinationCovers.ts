/** Destination cover images for trip cards (offline-friendly remote fallbacks). */

const COVERS: { match: RegExp; uri: string }[] = [
  {
    match: /zanzibar|tanzania|nungwi/i,
    uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  },
  {
    match: /dubai|uae|emirates/i,
    uri: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  },
  {
    match: /paris|france/i,
    uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  },
  {
    match: /tokyo|japan/i,
    uri: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  },
  {
    match: /london|uk|england/i,
    uri: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  },
  {
    match: /kenya|nairobi|mombasa/i,
    uri: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
  },
  {
    match: /bali|indonesia/i,
    uri: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  },
];

const FALLBACK =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

export function coverForDestination(destination?: string, country?: string): string {
  const hay = `${destination ?? ''} ${country ?? ''}`;
  for (const c of COVERS) {
    if (c.match.test(hay)) return c.uri;
  }
  return FALLBACK;
}
