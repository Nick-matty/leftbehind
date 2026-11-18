# LeftBehind — System Architecture

Status: proposed, Phase 1. Decisions marked **Accepted** are implemented in
`backend/supabase/migrations/**`; UI decisions are not yet implemented.

---

## 1. System context

```text
                    ┌──────────────────────────┐
                    │  Google Maps Platform     │
                    │  Maps · Places · Geocode  │
                    └───────────┬──────────────┘
                                │ server-side key only
┌───────────────┐   ┌───────────▼──────────────┐   ┌─────────────────────┐
│ Flutter app   │   │ Supabase Edge Functions  │   │  Push providers      │
│ Android / iOS │──▶│ places-proxy             │──▶│  FCM · APNs          │
└───────┬───────┘   │ ingest-places (staff)    │   └──────────▲──────────┘
        │           │ send-push                │              │
        │           │ delete-account           │              │
        │           └───────────┬──────────────┘              │
        │                       │ service role                │
        │           ┌───────────▼──────────────────────────────┴──────┐
        ├──────────▶│ Supabase                                            │
        │  HTTPS    │  Auth (JWT)  ·  PostgREST  ·  Realtime  ·  Storage  │
        │  + JWT    │  PostgreSQL 15  +  PostGIS  +  RLS policies         │
        │           └───────────▲────────────────────────────────────────┘
        │                       │ same API, same JWT, same RLS
┌───────▼───────┐   ┌───────────┴──────────────┐
│ React web app │   │ React admin dashboard    │
│ (discovery)   │──▶│ (privileged operations)  │
└───────────────┘   └──────────────────────────┘
```

Two clients, two web apps, one authorization model. There is **no custom REST
API**: the mobile app and both web apps talk to PostgREST and RPC functions under
the same Row Level Security rules.

---

## 2. Components

| Component | Technology | Responsibility |
| --- | --- | --- |
| `apps/mobile` | Flutter, Riverpod, GoRouter, Dio, Freezed, google_maps_flutter, geolocator | Android/iOS client |
| `apps/web` | React, Vite, TypeScript, Tailwind, shadcn/ui primitives, TanStack Query, Zustand, React Router, RHF + Zod, Framer Motion | Public web client |
| `apps/admin` | Same stack as web, separate build and deploy | Staff dashboard |
| `packages/shared` | TypeScript | Generated DB types, Supabase client factory, Zod schemas shared by web/admin, design tokens |
| `backend/supabase` | SQL migrations, seed, Edge Functions (Deno/TS) | Schema, policies, RPCs, privileged server logic |
| `docs/` | Markdown | Architecture, DB, API, design, setup, deployment, progress |

---

## 3. Decision records

### ADR-001 — Supabase as backend platform (Accepted)

**Decision.** Postgres, Auth, Storage, RLS and Edge Functions on Supabase; no
bespoke API server.

**Rationale.** The brief specifies Supabase. The 15-table domain is almost entirely
CRUD plus a handful of derived aggregates; PostgREST + RLS covers it with less
code and fewer places to get authorization wrong. The previous Express server
would have to reimplement every policy by hand.

**Consequences.** Authorization correctness becomes a database concern: policies
must be reviewed and tested like application code. Privileged operations
(Google Places proxying, push fan-out, account deletion) must live in Edge
Functions rather than in clients or ad-hoc SQL.

### ADR-002 — One canonical `places` table with 1:1 detail tables (Accepted)

**Decision.** Hotels, restaurants and attractions are rows in `places` with
`kind`, extended by `hotel_details` / `restaurant_details` / `attraction_details`.

**Rationale.** They share identity, address, coordinates, imagery, ratings,
reviews, saves and moderation. Three parallel entity tables would duplicate seven
relations each and force every list, map and search query into a `UNION`.

**Consequences.** Type-specific columns are constrained by the detail table's
presence (enforced in the app + moderation workflow, see `docs/database.md` §6).
A hotel cannot also be a restaurant row — acceptable, because a venue with both
uses one primary kind and its amenities describe the rest.

### ADR-003 — Roles live in a table, not in JWT claims (Accepted)

**Decision.** `public.user_roles` plus `SECURITY DEFINER` helpers
(`is_admin()`, `can_manage_content()`, `can_moderate()`, `is_super_admin()`).
Policies never trust a token claim for admin powers.

**Rationale.** Revocation must be immediate. Claims are stale until token refresh,
and a forged claim must not be able to reach admin paths. Table lookups are
cheap and indexed.

**Consequences.** Every privileged query costs one extra index lookup; that is the
intended trade. `auth.jwt()->>'role'` is only used for client UI hints, never for
authorization.

### ADR-004 — RLS on every table, plus a safety-critical public view (Accepted)

**Decision.** RLS enabled on all 20 tables. Public profile data is exposed through
`public.public_profiles` (owner-rights view, vetted column list), because a
row-level policy cannot hide columns.

**Consequences.** `public.profiles` stays private (preferences, privacy). New
columns must not be added to the view casually; there is a comment saying so.

### ADR-005 — Geo queries with PostGIS + GiST (Accepted)

**Decision.** `destinations.location` and `places.location` are generated
`geography(Point,4326)` columns indexed with GiST; proximity uses
`ST_DWithin` / `ST_Distance` instead of a haversine expression.

**Rationale.** Correct at high latitudes, index-supported, and it is what a
"near me" rail needs to stay under ~50 ms.

**Consequences.** Local Postgres needs PostGIS. Supabase provides it. The
`nearby_places` RPC is `security invoker`, so RLS still filters unpublished rows.

### ADR-006 — Search with generated `tsvector` + trigram fallback (Accepted)

**Decision.** `search_vector` generated columns (weights A/B/C), GIN index, and
`pg_trgm` indexes for typo-tolerant name matching; a single `search_places` /
`search_destinations` RPC handles query, category, kind, minimum rating, sorting,
limit and offset.

**Consequences.** No external search service in v1. If the catalogue grows past
low hundreds of thousands of rows, add a dedicated search service behind the same
RPC signature.

### ADR-007 — Photos in Supabase Storage, metadata in Postgres (Accepted)

**Decision.** Buckets `media` (public read, staff write) and `avatars` (public
read, owner write under `<user_id>/`); rows in `images`/`profiles.avatar_url`
hold paths, never bytes.

**Consequences.** Clients render with transform URLs (`?width=…`) and cache
aggressively (Cached Network Image / browser cache). Uploads validate MIME type
and size at the bucket level (5 MB media, 2 MB avatar).

### ADR-008 — Privileged work in Edge Functions (Accepted, not yet implemented)

**Decision.** Four functions:

| Function | Why it cannot be client-side |
| --- | --- |
| `places-proxy` | Holds the Google Places API key; returns normalised, rate-limited, cost-capped responses and records `source_place_id` |
| `ingest-places` | Staff-only bulk import/refresh; writes with the service role and logs activity |
| `send-push` | Needs FCM/APNs credentials; fans out to `device_tokens` (Phase 6) |
| `delete-account` | Must remove auth user, storage objects and owned rows atomically |

**Consequences.** Each function verifies the caller's JWT and re-checks the role
server-side before using the service role. No service-role key exists in any
client bundle.

### ADR-009 — Shared contracts through generated TypeScript types (Accepted)

**Decision.** `supabase gen types typescript` produces `packages/shared/src/db.ts`.
Web and admin import it. Flutter models (Freezed) are hand-written against
`docs/api.md`, because Dart code generation from Postgres types is not reliable
enough yet.

**Consequences.** A schema change is a three-step ritual: migration → regenerate
TS types → update Dart models. The roadmap's Phase 8 includes a CI check that the
generated types match the migrations.

### ADR-010 — Separate admin app, shared session issuer (Accepted)

**Decision.** `apps/admin` is its own Vite build with its own route guard, but
uses the same Supabase project and JWT. Access is gated by `user_roles` and, in
addition, by a dashboard route that calls `dashboard_stats()` — which raises
`42501` for non-admins even if the UI guard were bypassed.

**Consequences.** Admin must be deployed behind a distinct origin; still, the
real boundary is the database, not the build. No "admin" flag in any client
bundle grants access.

---

## 4. Target repository layout

```text
leftbehind/
├── apps/
│   ├── mobile/                 # Flutter (pubspec, lib/core|config|theme|routing|shared|features)
│   ├── web/                    # Vite + React public app
│   └── admin/                  # Vite + React staff dashboard
├── packages/
│   ├── shared/                 # generated db types, supabase client, zod schemas, query keys
│   └── design-tokens/          # tokens.json consumed by web (CSS vars) and Flutter (Dart)
├── backend/
│   └── supabase/
│       ├── config.toml
│       ├── migrations/         # 0001 schema, 0002 RLS, 0003 functions, 0004+ increments
│       ├── functions/          # edge functions (Deno)
│       └── seed/               # reference taxonomy (+ dev-only demo rows)
├── docs/                       # this set
├── scripts/                    # check_sql.py and other verifiers
├── .env.example
└── README.md                   # rewritten at Phase 9
```

The legacy Expo app (`app/`, `src/`, `server/`) stays at the root until Phase 9.

---

## 5. Client architecture

### 5.1 Web / admin

```text
src/
  app/            # router, providers, error boundary
  components/ui/  # shadcn primitives themed with tokens
  features/<domain>/  # api hooks, components, schemas per feature
  layouts/        # public shell, admin shell
  pages/
  hooks/
  services/       # supabase client, places client, storage helpers
  stores/         # zustand: UI-only state (filters, map viewport, theme)
  styles/
  types/
```

Rules:

- **TanStack Query owns server state**; Zustand never mirrors fetched entities.
- Query keys are centralised (`packages/shared/src/query-keys.ts`) and always
  include the user id when the data is user-scoped, so logout cannot leak cache.
- Every mutation that changes a list invalidates by key prefix, not by manual
  refetch.
- All forms use React Hook Form + Zod schemas shared with the server-side
  validation expectations in `docs/api.md`.

### 5.2 Mobile

```text
lib/
  core/      # errors, result types, http/dio interceptors, env
  config/    # env, supabase init, maps config
  theme/     # tokens, light/dark ThemeData, typography
  routing/   # GoRouter with auth redirect
  shared/    # widgets, formatters, extensions
  features/  # auth, home, explore, maps, hotels, restaurants, saved, reviews, profile
```

Rules:

- Riverpod providers are the only state access; `AsyncValue` drives loading /
  error / data UI. No `setState` for server data.
- Dio interceptors attach the Supabase access token and refresh it once on 401.
- Repository classes are the only place that touch `supabase_flutter` or Dio, so
  tests can substitute fakes.
- Secure storage holds the session; Shared Preferences holds non-sensitive
  preferences (theme, last viewport, onboarding complete).

### 5.3 Error, loading and empty state contract (both clients)

Every data surface implements four states: **loading skeleton**, **empty**,
**error with retry**, **content**. Offline is treated as an error state with a
cached-data fallback where available (saved places, last search results).
Mutation failures surface inline on the form, never as a silent no-op.

---

## 6. Security boundaries

1. **Client** may only use the anon key. It can read published content and its own
   rows; policies enforce this.
2. **Authenticated client** additionally writes its own reviews, saves,
   collections, reports and profile.
3. **Staff** (role-checked in the database) writes catalogue content and moderates.
4. **Service role** exists only inside Edge Functions, never in a bundle, never in
   an `.env` that ships.
5. **Secrets**: Google Places and push credentials live in Supabase function
   secrets; mobile map SDK keys are restricted by package name / bundle id and
   API surface in Google Cloud.

---

## 7. Performance budgets

| Surface | Budget |
| --- | --- |
| Web first contentful paint (4G) | ≤ 2.5 s |
| Route-level JS per page | ≤ 180 kB gzipped |
| List endpoints | paginated, ≤ 24 rows, indexed queries only |
| `nearby_places` at 5 km | ≤ 50 ms p95 on 100k places |
| Image payload | responsive `width` params, WebP/AVIF, lazy below the fold |
| Mobile cold start to interactive home | ≤ 2.5 s on a mid-range Android device |

---

## 8. Realtime

Used sparingly and only where it changes behaviour:

- Admin moderation queue: subscribe to new `content_reports` and pending reviews.
- Notification badge counts per user.

Everything else refetches on focus. Realtime is not used to replace queries.

---

## 9. What this architecture deliberately does not include

- No custom REST/GraphQL gateway (PostgREST + RPC is the API).
- No microservices, message queue or background worker at v1; Edge Functions and
  `pg_cron` cover scheduled ingestion.
- No offline write queue (saves and reviews require connectivity; reads are
  cached). Offline *writes* are a Phase 6 decision, not an assumption.
- No AI recommendations in v1: "recommended" and "trending" are deterministic
  aggregates of real data (`popularity`, `rating_avg`, recent saves), not invented
  scores.
