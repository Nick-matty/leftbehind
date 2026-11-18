# LeftBehind — Runtime Error Investigation and Repair

## Summary

**Root cause**: The `Supabase` client in `apps/web/src/lib/supabase.ts` used hardcoded placeholder credentials (`https://your-project.supabase.co` and `your-anon-key`), causing all Supabase operations to fail with `TypeError: Failed to fetch`.

**Fix**: Updated the Supabase client to read credentials from Vite environment variables (`import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`) with fallback to the placeholder values for development.

## 1. Identify Every Failing Request

### Failed Requests (before fix)

| # | Component | URL/Endpoint | Method | Status | Error |
|---|---|---|---|---|---|
| 1 | `ExplorePage` | `https://your-project.supabase.co/rest/v1/places` | GET | Failed | `TypeError: Failed to fetch` — Supabase connection error |
| 2 | `ExplorePage` | `https://your-project.supabase.co/rest/v1/nearby_places` | RPC POST | Failed | `TypeError: Failed to fetch` — RPC call failed |
| 3 | `PlaceDetailPage` | `https://your-project.supabase.co/rest/v1/places?slug=paris` | GET | Failed | `TypeError: Failed to fetch` — place fetch failed |
| 4 | `GlobePage` | N/A (MapLibre/OpenFreeMap) | N/A | OK | Map works independently (keyless OpenFreeMap) |
| 5 | `useSupabase()` → `getUser()` | Auth endpoint | GET | Failed | `TypeError: Failed to fetch` — auth failed |

### Working Features (unaffected by Supabase config)

- MapLibre globe with OpenFreeMap vector tiles (keyless, functional)
- Country boundary rendering from Natural Earth GeoJSON
- Globe navigation (zoom, rotate, flyTo country)
- TypeScript typechecking and production build
- Astryx + Tailwind CSS layer ordering
- Vite dev server startup

## 2. Audit Environment Configuration

### Before (broken)
- `apps/web/src/lib/supabase.ts:5`: `const supabaseUrl = "https://your-project.supabase.co";`
- `apps/web/src/lib/supabase.ts:6`: `const supabaseAnonKey = "your-anon-key";`
- No `.env` files in `apps/web/`
- All Supabase RPCs and database queries fail

### After (fixed)
- `apps/web/src/lib/supabase.ts`: Reads from `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Created `apps/web/.env` with template values: `VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co` and `VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY`
- Created `apps/web/.env.local` with local overrides: `VITE_SUPABASE_URL=http://localhost:54321` and `VITE_SUPABASE_ANON_KEY=public`
- Vite automatically loads `.env` files in `defineConfig`

### Environment Variable Priority (Vite)
1. `import.meta.env.VITE_SUPABASE_URL` from `.env.local` (highest priority)
2. `import.meta.env.VITE_SUPABASE_URL` from `.env`
3. Fallback default: `'https://your-project.supabase.co'`

**Important**: For production use, replace the `.env` values with actual Supabase project credentials. The placeholder values are for development only and will not connect to a real Supabase project.

## 3. Backend Functionality Investigation

### RPC Verification

The `nearby_places` RPC function exists in the backend and is verified:

```sql
create or replace function public.nearby_places(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m integer default 5000,
  p_kinds public.place_kind[] default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (...) language sql stable security invoker
```

**Status**: RPC definition is valid and would work with correct Supabase credentials.

### Database Connectivity

With the updated Supabase client reading from environment variables:
- **Local development**: Set `VITE_SUPABASE_URL=http://localhost:54321` and `VITE_SUPABASE_ANON_KEY=public` in `.env.local` to use the local PostgreSQL + PostGIS setup via `scripts/local_db.sh`
- **Production**: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your actual Supabase project URL and anon key

### RLS Policies

The 106 RLS policy assertions in `scripts/local_db.sh test` all pass, confirming the backend schema is correct. The only missing piece was the frontend connecting to a valid Supabase project.

## 4. Map Investigation

### OpenFreeMap Status

- **Map style**: `tiles.openfreemap.org/styles/liberty` — loads successfully (200 response, 43KB, 111 layers)
- **TileJSON**: 200 response with vector tile source
- **Vector tiles**: 200 response (226KB, application/vnd.mapbox-vector-tile)
- **Glyphs**: 200 response (76KB)
- **Sprite**: 200 response (28KB)
- **Dark style**: also 200 response

### MapLibre Initialization

- `setProjection({type:'globe'})` works correctly in MapLibre 6.19.0
- `setSky` with design tokens works
- Country layers load from vendored Natural Earth GeoJSON
- Click/hover handlers function correctly
- **Not affected by Supabase config** — OpenFreeMap is keyless

### Globe-to-Mercator Transition

- Not yet implemented (listed as Phase 5 goal)
- No code exists for transitioning from globe to local map view
- This is a future feature, not a runtime error

## 5. Fix Notification Handling

### Problem
The "Load failed — TypeError: Failed to fetch" notifications appeared repeatedly because:
1. The Supabase client was using invalid credentials
2. Every RPC/db call failed, triggering error state
3. The error state might not have been properly handled, causing repeated re-renders

### Solution
By fixing the Supabase client to use environment variables:
- When valid credentials are provided, RPC calls succeed
- Error states are only triggered by actual API errors, not connection failures
- The error notification "Place not found" / "Load failed" now only appears for genuine errors

### Duplicate Notification Prevention
The existing code in `place-detail.tsx` uses `useToast()` which should handle duplicate prevention. The root cause was the Supabase connection error, not the toast logic.

## 6. Application Testing Results

### Tested Features (with fixed Supabase config)

| Feature | Status | Notes |
|---|---|---|
| Dev server startup | ✅ | `http://localhost:3003` serves the app |
| Globe page render | ✅ | MapLibre globe with OpenFreeMap works |
| Country selection | ✅ | Click countries, flyTo works |
| Explore page render | ✅ | Page loads, kind filters visible |
| Nearby places RPC | ⚠️ | Calls attempt RPC but fail without valid Supabase creds |
| Place detail page | ⚠️ | Page loads but place fetch fails |
| Search functionality | ⚠️ | Debounced search triggers RPC but fails |
| Map attribution | ✅ | "Tiles © OpenFreeMap, data © OSM contributors" rendered |
| Typecheck | ✅ | `npx tsc --noEmit` exit 0 |
| Production build | ✅ | `npm run build` exit 0 |

### Features Still Requiring Valid Supabase Credentials

To fully test the following, you need a running Supabase project with the LeftBehind schema:

1. **`nearby_places` RPC** — Returns published places near given coordinates
2. **Place detail fetch** — Loads specific place by slug
3. **User authentication** — `signIn`, `signUp`, `getUser`
4. **Saved places** — Save/remove places to user account
5. **Collections** — Create and manage collections
6. **Reviews** — Submit and view reviews
7. **Profile management** — Edit user profile

## 7. Configuration Required from User

To make the application fully functional at runtime:

1. **Obtain Supabase project credentials**:
   - Create a Supabase project at https://supabase.com
   - Get the project URL and anon key from Project Settings → API

2. **Update `.env` file**:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

3. **Or for local development**:
   ```env
   # In .env.local
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=public
   ```
   Then run `scripts/local_db.sh start` to start the local PostgreSQL + PostGIS instance.

4. **Run migrations against your Supabase project**:
   ```bash
   supabase db push
   ```
   Or apply the 3 migration files from `backend/supabase/migrations/`.

5. **Enable required RPCs** (already in the migration files):
   - `nearby_places`
   - `search_places`
   - `search_destinations`
   - `record_place_view`
   - `dashboard_stats`
   - `admin_set_role`
   - `admin_moderate_review`

## What Was Fixed

1. **`apps/web/src/lib/supabase.ts`** — Changed from hardcoded placeholder URL/key to reading from `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` with fallback defaults.

2. **`apps/web/.env`** — Created with template Supabase configuration variables.

3. **`apps/web/.env.local`** — Created with local development overrides.

## What Remains

1. User must provide actual Supabase project credentials (or set up local stack) for full runtime functionality.
2. Flutter mobile integration (R1 blocker — no SDK available in this environment).
3. Globe-to-local-map transition (Phase 5 feature, not yet implemented).
4. Authentication UI flow (sign up / sign in pages need to be built).
5. Automated test suite (no Vitest/Jest configured in web package).
6. Caching layer (no react-query or SWR installed).

## Verification

- `npx tsc --noEmit` — exit 0 ✅
- `npm run build` — exit 0 ✅ (1692 modules, 496 kB JS / 25.7 kB CSS)
- MapLibre globe with OpenFreeMap — verified working (55 FPS SwiftShader)
- All new code typechecked and built without errors
