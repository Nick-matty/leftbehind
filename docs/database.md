# LeftBehind — Database Design

Implemented in `backend/supabase/migrations/`:

| File | Contents |
| --- | --- |
| `20261117090000_init.sql` | Extensions, enums, 20 tables, constraints, indexes, generated columns |
| `20261117090100_rls.sql` | Role helpers, RLS enablement, 55 policies, `public_profiles` view |
| `20261117090200_functions.sql` | Triggers, rating aggregation, geo/search RPCs, admin RPCs, storage buckets and policies |
| `../seed/0001_reference.sql` | Curated categories and amenity taxonomy only |

Syntax is verified with `scripts/check_sql.py` (libpg_query / `pglast`). The
migrations have **not** been applied to a live Postgres instance yet: this
environment has no Postgres server and no Docker daemon. Applying them to a local
Supabase stack is the first task of Phase 1 verification (`docs/setup.md`).

---

## 1. Entity relationship diagram

```text
auth.users (Supabase)
    │ 1:1 (trigger)
    ▼
profiles ──1:N── user_roles
    │
    ├──1:N── saved_places ──N:1── places
    │                    └──N:1── destinations
    ├──1:N── collections ──1:N── collection_items ──N:1── places / destinations
    ├──1:N── reviews ──────N:1── places / destinations
    ├──1:N── recent_views ──N:1── places / destinations
    ├──1:N── notifications
    ├──1:N── content_reports
    └──1:N── activity_logs (actor)

destination_categories ──N:M── destinations   (destination_category_links)
destinations ──1:N── places
places ──1:1── hotel_details / restaurant_details / attraction_details
places ──N:M── amenities   (place_amenities)
destinations / places ──1:N── images
```

Cardinality rules that matter:

- A `places` row belongs to **at most one** destination; it may belong to none
  (a place can be added before its destination is curated).
- A review targets **exactly one** of `place_id` / `destination_id`
  (`CHECK ((place_id IS NULL) <> (destination_id IS NULL))`). Same for
  `saved_places`, `collection_items`, `recent_views`, `images`.
- One review per user per target, enforced by partial unique indexes (a plain
  `UNIQUE` would allow unlimited `NULL` duplicates).

---

## 2. Table reference

### Identity

| Table | Purpose | Notable constraints |
| --- | --- | --- |
| `profiles` | Public/private identity, preferences, privacy | PK = `auth.users.id`; `username` citext unique, `^[a-z0-9_]{3,30}$`; `theme` ∈ light/dark/system; visibility ∈ public/private |
| `user_roles` | Additive role grants | `UNIQUE (user_id, role)`; roles: super_admin, administrator, content_manager, moderator, user |
| `activity_logs` | Append-only audit trail | `id` bigint identity; no client write policy; admin-only read |

### Catalogue

| Table | Purpose | Notable constraints |
| --- | --- | --- |
| `destination_categories` | Editorial collections ("Coastal escapes") | slug pattern, `sort_order`, `is_active` |
| `destination_category_links` | Category ↔ destination | composite PK |
| `destinations` | Cities / regions / islands | slug unique; lat/lng range checks; generated `location`, `search_vector`; `rating_avg` derived |
| `places` | Canonical visitable entity (8 kinds) | slug unique; `UNIQUE (data_source, source_place_id)`; `price_level` 1–4; `website` must be http(s) |
| `hotel_details` | Hotel-only attributes | `star_rating` 1–5, `room_count`, check-in/out times, booking provider + URL |
| `restaurant_details` | Restaurant-only attributes | `cuisines text[]`, `serves_alcohol`, reservations URL, dress code |
| `attraction_details` | Attraction-only attributes | `is_free`, entry fee + currency, typical duration |
| `amenities` / `place_amenities` | Feature catalog | slug unique; many-to-many |
| `images` | Photography metadata | exactly one parent; `storage_path` unique; `is_cover`, `sort_order` |

### User content

| Table | Purpose | Notable constraints |
| --- | --- | --- |
| `saved_places` | Bookmark a place or destination | one target; unique per user per target; optional note |
| `collections` | Named, optionally public lists | unique `(user_id, lower(name))` |
| `collection_items` | Ordered items | unique per collection per target |
| `reviews` | Ratings + text | rating 1–5; one per user per target; `visit_date <= today`; status published/hidden/removed; moderation columns |
| `recent_views` | Recently viewed rail | one row per user per target, upserted |
| `notifications` | In-app feed | `dedupe_key` unique per user for idempotent fan-out |
| `content_reports` | Moderation queue | one report per reporter per entity; reason enum |

---

## 3. Derived data (never written by clients)

| Column | Updated by |
| --- | --- |
| `places.rating_avg`, `places.rating_count` | `reviews_sync_rating` trigger after insert/update/delete |
| `destinations.rating_avg`, `.rating_count` | same trigger |
| `*.updated_at` | `set_updated_at` trigger |
| `profiles` row | `handle_new_user` trigger on `auth.users` insert |
| `notifications` on moderation | `notify_review_moderation` trigger |

The review guard trigger also refuses reviews on unpublished targets and enforces
a flood limit of 20 reviews per rolling 24 h for one account.

---

## 4. Indexing strategy

| Index | Serves |
| --- | --- |
| `places_location_gist`, `destinations_location_gist` | `nearby_places` radius search |
| `places_search_gin`, `destinations_search_gin` | `search_places` / `search_destinations` ranking |
| `places_name_trgm`, `destinations_name_trgm` | fuzzy name matching (`ilike`) |
| `places (kind, status)` | Explore category tabs |
| `places (rating_avg desc, rating_count desc) WHERE published` | "Top rated" sort |
| `places (published_at desc) WHERE published` | "Newest" sort |
| partial unique indexes on `saved_places`, `reviews`, `collection_items`, `recent_views` | one-per-target semantics without blocking NULLs |
| `notifications (user_id) WHERE read_at IS NULL` | unread badge |
| `content_reports (status, created_at desc)` | moderation queue |

Every query path in `docs/api.md` has a supporting index. Any new query needs one
reviewed in the same migration.

---

## 5. Row Level Security matrix

Legend: **–** no access, **own** own rows only, **pub** published rows,
**staff** content roles, **mod** moderator roles, **admin** administrator roles.

| Table | anon | authenticated | staff | moderator | admin |
| --- | --- | --- | --- | --- | --- |
| `profiles` | – (use `public_profiles` view) | own select/update | – | – | all select |
| `public_profiles` (view) | pub | pub | pub | pub | pub |
| `user_roles` | – | own select | – | – | select; **super_admin** writes |
| `destination_categories` | active | active | write | – | write |
| `destination_category_links` | published parent | same | write | – | write |
| `destinations` | published | published | write | – | write |
| `places` + `*_details` | published | published | write | – | write |
| `amenities` / `place_amenities` | read | read | write | – | write |
| `images` | published parent | same | write | – | write |
| `saved_places` | – | own CRUD | own | own | own |
| `collections` | public read (share link) | own CRUD + public read | own | own | own |
| `collection_items` | public collection read | own collection; public read | own | own | own |
| `recent_views` | – | own | own | own | own |
| `reviews` | published | published + own CRUD | published | status changes, delete | status changes, delete |
| `notifications` | – | own select, mark read | own | own | own |
| `content_reports` | – | insert own, read own | – | read + resolve | read + resolve |
| `activity_logs` | – | – | – | – | read |

Storage: `media` public read / staff write; `avatars` public read, owner write
under `<user_id>/`.

Role checks are `SECURITY DEFINER` helpers, granted to `anon` as well, because
anonymous read policies call them; they return `false` without a session.

### 5.1 Privileges

Table privileges for `anon` / `authenticated` are declared explicitly in
`20261117090100_rls.sql` rather than inherited from Supabase's project template,
so the schema behaves identically on any platform. They are deliberately wide
(`select, insert, update, delete`) and RLS is what actually restricts access;
`tests/10_rls.sql` proves the restriction, including that a missing policy is a
denial rather than an implicit allow.

`grant usage on schema extensions to anon, authenticated` is required because
`nearby_places()` is `SECURITY INVOKER` and calls PostGIS functions. Removing it
breaks anonymous map queries with `42501`, which is what the suite caught.

### 5.2 Review write path

`reviews_guard()` is the single place that decides what a write may change:

| Actor | Insert | Update |
| --- | --- | --- |
| Author | forced to `published`; author must be `auth.uid()` | may edit content; cannot touch `status`, `moderation_*`, `user_id`, `created_at`; rate limited to 20/24h |
| Moderator | may pre-set `status` | may change status and moderation fields on any review |
| Server (`auth.uid()` null) | allowed | allowed |

The moderator branch is what makes `admin_moderate_review()` work at all — an
earlier version rejected every moderator update, which the suite caught.

---

## 6. Deliberate deviations from the suggested schema

The brief listed 15 tables; the implementation has 20. Each addition solves a
stated requirement, and each rename is documented so nothing looks accidental.

| Brief | Implementation | Why |
| --- | --- | --- |
| `hotels`, `restaurants`, `attractions` as top-level tables | `places` + three 1:1 detail tables | Avoids duplicating identity, geo, images, ratings, saves and reviews three times (ADR-002) |
| `destination_images` | `images` | The same table must also hold hotel/restaurant photos; naming it after destinations would mislead |
| — | `destination_category_links` | A destination belongs to several editorial categories; a single FK column could not express that |
| — | `amenities`, `place_amenities` | "Available amenities" is a filterable dimension, not a text blob |
| — | `recent_views` | Home has a "Recently viewed" rail that must survive reinstalls |
| — | `content_reports` | Review moderation needs a queue, not just a status column |
| — | `public_profiles` (view) | Column-level privacy is impossible with row policies alone |

---

## 7. Migration conventions

1. One concern per file: `schema`, `rls`, `functions`, then feature increments.
2. Timestamped names (`YYYYMMDDHHMMSS_name.sql`), immutable once pushed.
3. Additive by default. Dropping or renaming requires a follow-up migration plus
   a note in `docs/progress.md` and a regenerated `packages/shared/src/db.ts`.
4. Every new table: RLS enabled in the same PR, policies listed in §5, at least
   one index for each query pattern.
5. Seed files hold taxonomy only. Business data comes from Google Places
   ingestion or staff entry — never invented.
6. `scripts/check_sql.py` must pass before a migration is considered reviewable.
   Applied-migration verification is required before deployment.

---

## 8. Known gaps (tracked, not hidden)

- `device_tokens` (push registration) is not in the schema yet; it lands in Phase 6
  together with `send-push`.
- Notification fan-out for "saved place updated" needs a trigger on `places`
  updates; deferred until the notification feed UI exists (Phase 6).
- No materialised view for trending destinations; `popularity` is updated by
  ingestion and admin tooling for now.
- `places.kind` and the detail tables are not mutually enforced in SQL. The admin
  form creates the matching detail row in the same transaction; a future
  constraint trigger can enforce it once the ingestion path is stable.
