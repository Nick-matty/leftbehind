// Same-origin by default so requests go through the dev-server / production
// /api proxy instead of pointing a browser at its own localhost:4000.
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin : '');

// Search params interface
export interface SearchParams {
  q?: string;
  kind?: string;
  destination_id?: string;
  country_code?: string;
  city?: string;
  page?: number;
  limit?: number;
}

// Paginated response interface
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * The API returns list envelopes keyed by resource (`{ places }`,
 * `{ destinations }`), not `{ items }`. Normalise so callers always get one
 * shape and never end up rendering an undefined array.
 */
function toPage<T>(payload: any, key: string): PaginatedResponse<T> {
  return {
    items: (payload?.[key] ?? payload?.items ?? []) as T[],
    page: payload?.page ?? 1,
    limit: payload?.limit ?? 20,
    total: payload?.total ?? 0,
  };
}

// Place summary interface
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  kind: string;
  destination_id?: string;
  city: string;
  country_code: string;
  description: string;
  hero_image_path?: string;
  status: string;
  featured: boolean;
  popularity: number;
  rating_avg: number;
  rating_count: number;
}

// Place interface (for place detail)
export interface Place {
  id: string;
  slug: string;
  name: string;
  kind: string;
  destination_id?: string;
  city: string;
  country_code: string;
  description: string;
  hero_image_path?: string;
  status: string;
  featured: boolean;
  popularity: number;
  rating_avg: number;
  rating_count: number;
}

// Nearby places API
export async function fetchNearbyPlaces(params: {
  kind?: string;
  city?: string;
  country_code?: string;
  radius_km?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<PlaceSummary>> {
  const url = new URL(`${API_BASE}/api/places`);
  if (params.kind) url.searchParams.set('kind', params.kind);
  if (params.city) url.searchParams.set('city', params.city);
  if (params.country_code) url.searchParams.set('country_code', params.country_code);
  if (params.radius_km) url.searchParams.set('radius_km', String(params.radius_km));
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));

  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch nearby places');
  return toPage<PlaceSummary>(await response.json(), 'places');
}

// Place detail API
export async function fetchPlaceDetail(slug: string): Promise<Place> {
  const response = await fetch(`${API_BASE}/api/places/${slug}`);
  if (!response.ok) throw new Error('Failed to fetch place detail');
  const payload = await response.json();
  // The API wraps the record as { place: ... }.
  return (payload?.place ?? payload) as Place;
}

// Destinations API
export async function fetchDestinations(params?: SearchParams): Promise<PaginatedResponse<any>> {
  const url = new URL(`${API_BASE}/api/destinations`);
  if (params) {
    if (params.q) url.searchParams.set('q', params.q);
    if (params.kind) url.searchParams.set('kind', params.kind);
    if (params.destination_id) url.searchParams.set('destination_id', params.destination_id);
    if (params.country_code) url.searchParams.set('country_code', params.country_code);
    if (params.city) url.searchParams.set('city', params.city);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.limit) url.searchParams.set('limit', String(params.limit));
  }

  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch destinations');
  return toPage(await response.json(), 'destinations');
}

// Hotels API
export async function fetchHotels(params?: SearchParams): Promise<PaginatedResponse<any>> {
  const url = new URL(`${API_BASE}/api/hotels`);
  if (params) {
    if (params.q) url.searchParams.set('q', params.q);
    if (params.kind) url.searchParams.set('kind', params.kind);
    if (params.destination_id) url.searchParams.set('destination_id', params.destination_id);
    if (params.country_code) url.searchParams.set('country_code', params.country_code);
    if (params.city) url.searchParams.set('city', params.city);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.limit) url.searchParams.set('limit', String(params.limit));
  }

  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch hotels');
  return toPage(await response.json(), 'hotels');
}

// Restaurants API
export async function fetchRestaurants(params?: SearchParams): Promise<PaginatedResponse<any>> {
  const url = new URL(`${API_BASE}/api/restaurants`);
  if (params) {
    if (params.q) url.searchParams.set('q', params.q);
    if (params.kind) url.searchParams.set('kind', params.kind);
    if (params.destination_id) url.searchParams.set('destination_id', params.destination_id);
    if (params.country_code) url.searchParams.set('country_code', params.country_code);
    if (params.city) url.searchParams.set('city', params.city);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.limit) url.searchParams.set('limit', String(params.limit));
  }

  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch restaurants');
  return toPage(await response.json(), 'restaurants');
}

// Attractions API
export async function fetchAttractions(params?: SearchParams): Promise<PaginatedResponse<any>> {
  const url = new URL(`${API_BASE}/api/attractions`);
  if (params) {
    if (params.q) url.searchParams.set('q', params.q);
    if (params.kind) url.searchParams.set('kind', params.kind);
    if (params.destination_id) url.searchParams.set('destination_id', params.destination_id);
    if (params.country_code) url.searchParams.set('country_code', params.country_code);
    if (params.city) url.searchParams.set('city', params.city);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.limit) url.searchParams.set('limit', String(params.limit));
  }

  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch attractions');
  return toPage(await response.json(), 'attractions');
}

// Reviews API
export async function fetchReviews(placeId?: string): Promise<any[]> {
  const url = new URL(`${API_BASE}/api/reviews`);
  if (placeId) {
    url.searchParams.set('place_id', placeId);
  }
  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Failed to fetch reviews');
  return response.json();
}

// Saved places API
export interface SavedPlace {
  id: string;
  user_id: string;
  place_id: string;
  place_slug: string;
  notes?: string;
  created_at: string;
}

export async function fetchSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const response = await fetch(`${API_BASE}/api/saved-places?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch saved places');
  return response.json();
}

export async function savePlace(savedPlace: { place_id: string; notes?: string }): Promise<SavedPlace> {
  const response = await fetch(`${API_BASE}/api/saved-places`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(savedPlace),
  });
  if (!response.ok) throw new Error('Failed to save place');
  return response.json();
}

export async function removeSavedPlace(savedPlaceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/saved-places/${savedPlaceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove saved place');
}

// Collections API
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  visibility: 'private' | 'public';
  created_at: string;
  items: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  place_id: string;
  place_slug: string;
  order_index: number;
}

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const response = await fetch(`${API_BASE}/api/collections?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch collections');
  return response.json();
}

export async function createCollection(name: string, visibility: 'private' | 'public' = 'private'): Promise<Collection> {
  const response = await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, visibility }),
  });
  if (!response.ok) throw new Error('Failed to create collection');
  return response.json();
}

export async function addItemToCollection(collectionId: string, placeId: string, orderIndex: number): Promise<CollectionItem> {
  const response = await fetch(`${API_BASE}/api/collections/${collectionId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ place_id: placeId, order_index: orderIndex }),
  });
  if (!response.ok) throw new Error('Failed to add item to collection');
  return response.json();
}

export async function removeItemFromCollection(itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/collections/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove item from collection');
}

// Notifications API
export async function fetchNotifications(userId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/notifications?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
}

// Auth API
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
}

export async function register(name: string, email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) throw new Error('Registration failed');
  return response.json();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
  if (!response.ok) throw new Error('Failed to get current user');
  return response.json();
}

export async function refreshToken(): Promise<{ access_token: string }> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error('Token refresh failed');
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}