# LeftBehind — Data API

There is no custom REST server. Clients use PostgREST (via `supabase-js` /
`supabase_flutter`) and the RPC functions below. Authorization is enforced by
RLS, so the API surface is always "whatever your JWT is allowed to see".

Base URL: `https://<project-ref>.supabase.co`
Headers: `apikey: <anon key>`, `Authorization: Bearer <access token>` (omit for
anonymous reads of published content).

---

## 1. Access conventions

- **Anonymous** may read published `destinations`, `places`, their details,
  `images`, `amenities`, `destination_categories` and published `reviews`.
- **Authenticated** adds own profile, saves, collections, reviews, notifications,
  reports.
- **Staff** adds catalogue writes (`can_manage_content()`).
- **Moderators** add review status changes and report resolution.
- Client-side role checks are UI hints only; every request is re-authorized.

Pagination is always explicit: `limit` (max 100, default 20) and `offset`.
List endpoints must request `count: 'exact'` only when a total is displayed.

---

## 2. Read patterns

### 2.1 Destination detail with categories and images

```ts
const { data } = await supabase
  .from('destinations')
  .select(`
    id, slug, name, country_code, region, city, summary, description,
    latitude, longitude, timezone, hero_image_path, rating_avg, rating_count, featured,
    destination_category_links ( destination_categories ( slug, name, icon ) ),
    images ( storage_path, alt_text, width, height, credit, is_cover, sort_order )
  `)
  .eq('slug', slug)
  .single();
```

### 2.2 Place detail (kind-specific join)

```ts
const { data } = await supabase
  .from('places')
  .select(`
    *,
    hotel_details (*),
    restaurant_details (*),
    attraction_details (*),
    place_amenities ( amenities ( slug, name, icon ) ),
    images ( storage_path, alt_text, is_cover, sort_order ),
    destinations ( slug, name )
  `)
  .eq('slug', slug)
  .single();
```

All three detail relations are requested once; only the matching one is non-null.
This keeps one client method (`PlaceRepository.getBySlug`) for every kind.

### 2.3 Reviews for a target

```ts
const { data, count } = await supabase
  .from('reviews')
  .select('id, rating, title, body, visit_date, created_at, updated_at, profiles:user_id ( full_name, avatar_url )', { count: 'exact' })
  .eq('place_id', placeId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

RLS already hides non-published reviews except for the author and moderators.

### 2.4 Saved places with entity payload

```ts
await supabase
  .from('saved_places')
  .select('id, created_at, note, places ( id, slug, name, kind, city, rating_avg, images ( storage_path ) ), destinations ( id, slug, name, hero_image_path )')
  .order('created_at', { ascending: false });
```

### 2.5 Home rails

| Rail | Query |
| --- | --- |
| Featured destinations | `destinations` where `featured = true` and `published`, order `popularity desc`, limit 10 |
| Trending | `destinations` published, order `popularity desc`, limit 10 |
| Top rated hotels | `places` `kind = 'hotel'`, order `rating_avg desc`, `rating_count desc`, limit 10 |
| Nearby attractions | `rpc('nearby_places', { p_kinds: ['attraction'], p_radius_m: 10000 })` |
| Recently viewed | `recent_views` order `viewed_at desc` limit 10 with joined entity |
| Recommended hotels/restaurants | `search_places` with the user's home destination + `p_sort: 'rating'`; deterministic, no invented scoring |

---

## 3. RPC contracts

### 3.1 `nearby_places`

```sql
nearby_places(
  p_latitude   double precision,
  p_longitude  double precision,
  p_radius_m   integer  default 5000,
  p_kinds      place_kind[] default null,
  p_limit      integer  default 20,
  p_offset     integer  default 0
) returns table (
  id uuid, slug text, name text, kind place_kind, city text,
  latitude double precision, longitude double precision,
  rating_avg numeric, rating_count integer, price_level smallint,
  cover_image_path text, distance_m double precision
)
```

- `security invoker`: RLS filters unpublished rows.
- `p_limit` clamped to 1..100; `p_offset` ≥ 0.
- Sorted by distance ascending.

```ts
const { data } = await supabase.rpc('nearby_places', {
  p_latitude: lat, p_longitude: lng, p_radius_m: 5000,
  p_kinds: ['restaurant', 'attraction'], p_limit: 24,
});
```

### 3.2 `search_places`

```sql
search_places(
  p_query text,
  p_kind place_kind default null,
  p_destination_id uuid default null,
  p_min_rating numeric default null,
  p_sort text default 'relevance',   -- relevance | rating | name | newest
  p_limit integer default 20,
  p_offset integer default 0
) returns table (
  id uuid, slug text, name text, kind place_kind, city text, address_line text,
  latitude double precision, longitude double precision,
  rating_avg numeric, rating_count integer, price_level smallint,
  cover_image_path text
)
```

- Empty/whitespace query = browse (filters still apply).
- Matching: `websearch_to_tsquery` ranking, then `ilike` on name/city.
- Sorting is deterministic; unknown `p_sort` falls back to relevance ordering.

### 3.3 `search_destinations`

```sql
search_destinations(
  p_query text,
  p_category_slug text default null,
  p_country_code char(2) default null,
  p_limit integer default 20,
  p_offset integer default 0
) returns table (
  id uuid, slug text, name text, country_code char(2), city text, summary text,
  latitude double precision, longitude double precision,
  rating_avg numeric, rating_count integer, hero_image_path text, popularity integer
)
```

Order: relevance, then `featured`, then `popularity`.

### 3.4 `record_place_view`

```sql
record_place_view(p_place_id uuid default null, p_destination_id uuid default null) returns void
```

- Requires a session (`42501` otherwise); exactly one target (`22023` otherwise).
- Upserts `recent_views.viewed_at`. Safe to call on every detail open; clients
  should debounce repeated views of the same entity.

### 3.5 `dashboard_stats` (admin)

```sql
dashboard_stats() returns jsonb
```

Returns `users_total`, `users_new_7d`, `destinations.{published,draft}`,
`places.{published,draft,by_kind}`, `reviews.{total,last_7d,average_rating}`,
`moderation.{open_reports,hidden_reviews}`, `saves_total`, `generated_at`.
Raises `42501` unless the caller is an administrator.

### 3.6 `admin_set_role` (super admin)

```sql
admin_set_role(p_user_id uuid, p_role app_role, p_enabled boolean) returns void
```

- `super_admin` only (`42501`). `user` cannot be granted/revoked (`22023`).
- Writes `activity_logs` (`role.grant` / `role.revoke`).

### 3.7 `admin_moderate_review` (moderator)

```sql
admin_moderate_review(p_review_id uuid, p_status review_status, p_note text default null) returns void
```

- `can_moderate()` only (`42501`), missing review (`P0002`).
- Sets `moderated_by`/`moderated_at`, logs `review.moderate`, and the
  `notify_review_moderation` trigger notifies the author.

---

## 4. Write patterns

### 4.1 Save / unsave

```ts
await supabase.from('saved_places').insert({ place_id: placeId });        // user_id defaults to auth.uid()
await supabase.from('saved_places').delete().eq('place_id', placeId);     // RLS scopes to the owner
```

A duplicate insert fails with `23505` (unique violation). Clients treat that as
"already saved" rather than a user-visible error.

### 4.2 Review lifecycle

```ts
// create — status is forced to 'published' for non-moderators by the guard trigger
await supabase.from('reviews').insert({ place_id: placeId, rating: 5, title, body, visit_date });

// edit — author cannot change status/moderation fields (trigger raises 42501)
await supabase.from('reviews').update({ rating, title, body }).eq('id', reviewId);

// delete
await supabase.from('reviews').delete().eq('id', reviewId);
```

Second review for the same target fails with `23505`; the UI offers "edit your
review" instead.

### 4.3 Report content

```ts
await supabase.from('content_reports').insert({
  entity_type: 'review', entity_id: reviewId, reason: 'spam', details,
});
```

One report per reporter per entity (`23505` on repeat).

### 4.4 Profile update

```ts
await supabase.from('profiles').update({ full_name, bio, home_city, theme, profile_visibility }).eq('id', userId);
```

`id` cannot change (policy `WITH CHECK`), and preferences are never exposed via
`public_profiles`.

### 4.5 Avatar upload

```ts
const path = `${userId}/avatar-${Date.now()}.webp`;
await supabase.storage.from('avatars').upload(path, file, { contentType: 'image/webp', upsert: true });
await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId);
```

Bucket limits: 2 MB, jpeg/png/webp. Media bucket (staff): 5 MB.

---

## 5. Error codes

| Code | Meaning | Client behaviour |
| --- | --- | --- |
| `42501` | Permission denied (RLS, role check, review guard) | Show "not available" state; never retry blindly |
| `42901` | Review flood limit (20 / 24 h) | Inline message with retry-later guidance |
| `22023` | Invalid RPC argument | Developer error; log, do not surface raw text |
| `23505` | Unique violation | Depends on table: saved = benign, review = offer edit |
| `P0002` | Row not found in admin RPC | Refresh the moderation queue |
| `PGRST116` | `.single()` returned 0 rows | Render "not found" page |

---

## 6. Edge Function contracts (Phase 5, not yet implemented)

| Route | Auth | Contract |
| --- | --- | --- |
| `POST /functions/v1/places-proxy/autocomplete` | authenticated | `{ input, sessionToken }` → `{ predictions: [{ placeId, primary, secondary }] }`; server-side key, per-user quota |
| `POST /functions/v1/places-proxy/details` | authenticated | `{ placeId, sessionToken }` → normalised place payload + attribution fields |
| `POST /functions/v1/ingest-places` | staff JWT | `{ placeIds[] }` → upserts `places` rows with `data_source='google_places'`, `source_place_id`, logs activity |
| `POST /functions/v1/send-push` | service (internal) | `{ userIds[], title, body, data }` → FCM/APNs fan-out |
| `POST /functions/v1/delete-account` | owner JWT | Deletes storage objects, auth user; cascades profile-owned rows |

Every function re-checks the caller's role from `user_roles`; none trusts a
header or client flag.

---

## 7. Caching and freshness

| Data | Client cache |
| --- | --- |
| Destinations / places (published) | TanStack Query `staleTime: 5 min`; browser HTTP cache for images |
| Reviews for a target | `staleTime: 30 s`, invalidated after own mutation |
| Saved places / collections | `staleTime: 10 s`, optimistic add/remove |
| Notifications | `staleTime: 15 s`, realtime badge |
| Near-me results | `staleTime: 60 s`, keyed by rounded coordinates (±0.01°) and filter set |

Google-sourced fields must respect the source's attribution and caching terms;
see `docs/risks.md` R4 before caching any Places payload beyond its `place_id`.
