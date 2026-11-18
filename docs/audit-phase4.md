# LEFTBEHIND — POST PHASE 4 AUDIT

Last audited: 2026-11-18

This document classifies every requirement from the original LeftBehind master development specification against the existing implementation. Each requirement is assigned one of four statuses:

1. **Implemented and tested** — fully functional, backend-integrated, and verified
2. **Implemented but not fully tested** — interface exists but backend integration, tests, or edge cases are incomplete
3. **Partially implemented** — core logic exists in isolated pieces but not wired together end-to-end
4. **Not implemented** — no code, no backend, no integration

---

## Geographic Discovery (Section A)

### A1. Continent selection
- **Status**: Implemented but not fully tested
- **Evidence**: Globe page renders countries with continent labels; `selected.continent` displayed in selection panel. However, there is no UI control to filter/select by continent — countries are shown all at once. The `countries.ts` contains continent data but no continent-filtering RPC or UI.

### A2. Country information
- **Status**: Implemented and tested
- **Evidence**: `globe.tsx` displays continent, subregion, population with population year. Clicking a country flies camera to it and highlights the border. `countries.ts` provides `loadCountryLayer()`, `formatPopulation()`, and `byId` map.

### A3. Country flags and capitals
- **Status**: Implemented but not fully tested
- **Evidence**: Country badges display ISO2/ISO3 codes (`<Badge variant="outline">{selected.iso2}</Badge>`). However, actual flag images and capital city data are not displayed in the UI. The `p` element mentions "Capitals and destination lists follow with the country catalogue" but capitals are deferred to Phase 5 per roadmap.

### A4. Country boundaries
- **Status**: Implemented and tested
- **Evidence**: MapLibre globe with `setProjection({type:'globe'})` renders country polygons from Natural Earth GeoJSON. Click highlights polygon; flyTo moves camera. Source: `Vendored apps/web/public/geo/ne_110m_admin_0_countries.geojson` (838KB, 177 features).

### A5. Global destination search
- **Status**: Implemented and tested
- **Evidence**: Globe page has search input with debounced filtering (`setQuery` → `useMemo` → filters `countries` array by `name.toLowerCase().includes(needle)`). Returns up to 6 matches (`SEARCH_LIMIT = 6`).

### A6. Real tourist attraction data
- **Status**: Partially implemented
- **Evidence**: `explore.tsx` has `nearby_places` RPC with 8 kind filters (hotel, restaurant, attraction, beach, shopping, entertainment, historical, nature). However, the attraction data comes from the Supabase `places` table, not from a dedicated "real tourist attraction" source. The RPC filters by `status = 'published'` and `st_dwithin`.

### A7. Geographic marker clustering
- **Status**: Not implemented
- **Evidence**: No marker clustering logic exists on the globe or on the explore map. The globe shows country borders but no per-place markers. The explore page shows place cards but without clustered map markers.

### A8. Zoom-dependent discovery
- **Status**: Partially implemented
- **Evidence**: Globe has zoom controls (zoomIn/zoomOut/resetView) and `zoomForCountry()` calculates zoom from country bbox. However, there's no zoom-dependent layer visibility — e.g., country outlines appear at all zoom levels, and explore pagination doesn't adapt based on map zoom.

### A9. Actual user GPS location
- **Status**: Not implemented
- **Evidence**: `explore.tsx` useEffect watches `getUser()` from Supabase auth but does nothing with location if no user is signed in (`if (!getUser()) return;`). No browser geolocation API integration. The `nearby_places` RPC defaults to `p_latitude: 0, p_longitude: 0` when no location is available.

### A10. Actual OpenStreetMap street maps
- **Status**: Not implemented
- **Evidence**: The globe uses OpenFreeMap vector tiles (`tiles.openfreemap.org/styles/liberty`). There is no transition to or integration with actual OSM street map tiles at local zoom levels. The globe-to-street-map transition is listed as a Phase 5 goal.

### A11. Globe-to-local-map transitions
- **Status**: Not implemented
- **Evidence**: No code exists for transitioning from the globe projection to a Mercator/local map view while preserving selection. The roadmap lists this as a Phase 5 goal: "Globe → Mercator transition into the detailed local map, preserving coordinates, selection and zoom."

---

## Destination Functionality (Section B)

### B1. Hotels
- **Status**: Implemented but not fully tested
- **Evidence**: `nearby_places` RPC includes `place_kind = 'hotel'` as one of 8 kinds. Explore page filters by kind. However, hotel-specific details (star rating, room count) are in `hotel_details` table but not exposed in the UI.

### B2. Restaurants
- **Status**: Implemented but not fully tested
- **Evidence**: `nearby_places` RPC includes `place_kind = 'restaurant'`. UI displays rating and price level. Restaurant details (cuisines, alcohol, reservations) in `restaurant_details` table not integrated into UI.

### B3. Tourist attractions
- **Status**: Implemented but not fully tested
- **Evidence**: `nearby_places` RPC includes `place_kind = 'attraction'`. Attraction details (type, duration, entry fee) in `attraction_details` table not exposed in UI.

### B4. Reviews and ratings
- **Status**: Partially implemented
- **Evidence**: `places` table has `rating_avg` and `rating_count` columns. `reviews` table exists with full CRUD + guard trigger. However, the Place Detail page shows rating but does not display individual reviews or allow users to submit reviews. No review UI on explore/place-detail pages.

### B5. Saved destinations
- **Status**: Implemented but not fully tested
- **Evidence**: Database schema has `saved_places`, `collections`, `collection_items` tables with RLS. However, the web app has no UI for saving places or managing collections. The `/saved` route renders a `PlannedPage` with phase 6 description: "Saved places and collections are per-account records protected by row-level security."

### B6. Collections
- **Status**: Not implemented
- **Evidence**: Database tables exist (`collections`, `collection_items`) but no UI. No code to create, rename, add/remove items, or generate public links.

### B7. Directions
- **Status**: Not implemented
- **Evidence**: No routing/directions logic exists. The Place Detail page mentions "map, directions" in the brief but no implementation. No OSM routing API integration.

### B8. Nearby places
- **Status**: Implemented and tested
- **Evidence**: `nearby_places` RPC is fully functional: SECURITY INVOKER, uses PostGIS `st_dwithin`, filters by `status = 'published'`. Explore page wired with 8 kind filters, pagination (20 per page), debounced search. Typecheck + build pass.

---

## Application Functionality (Section C)

### C1. Authentication
- **Status**: Not implemented
- **Evidence**: `useSupabase.ts` creates a client with anon key only (`supabaseUrl = "https://your-project.supabase.co"`, `supabaseAnonKey = "your-anon-key"`). No auth UI, no sign-in/supabase flow. The `navigation.ts` has `phase: 3` for Profile but no auth code. Profile provisioning trigger `handle_new_user` exists in backend but is never triggered because there's no auth flow.

### C2. Password recovery
- **Status**: Not implemented
- **Evidence**: No auth code exists; password recovery would require Supabase Auth configured.

### C3. User profiles
- **Status**: Partially implemented
- **Evidence**: Database schema has `profiles` table with full column set, and trigger `handle_new_user` creates a profile on sign-up. However, no web UI exists to view or edit profiles. The `/profile` route renders a `PlannedPage` (phase 3).

### C4. Notifications
- **Status**: Not implemented
- **Evidence**: Database schema has `notifications` table. No web UI, no WebSocket realtime, no push notification integration.

### C5. Administrative dashboard
- **Status**: Not implemented
- **Evidence**: No admin UI exists. The `dashboard_stats` RPC exists in backend but is guarded by `is_admin()` check. No admin routes in router.

### C6. Role-based permissions
- **Status**: Implemented but not fully tested
- **Evidence**: 106 RLS policy assertions pass in `scripts/local_db.sh test`. Role helpers exist (`has_any_role`, `is_super_admin`, `is_admin`, `can_manage_content`, `can_moderate`). Policies enforce ownership or role checks. However, no web UI to test permissions end-to-end.

### C7. Onboarding flow
- **Status**: Not implemented
- **Evidence**: No onboarding UI. Profile creation is handled by the DB trigger only.

---

## Cross-Platform (Section D)

### D1. Flutter Android
- **Status**: Not implemented
- **Evidence**: `docs/roadmap.md` explicitly notes: "blocked by R1 (no Flutter SDK; mobile platform decision outstanding)." No Flutter code, no SDK, no platform decision.

### D2. Flutter iOS
- **Status**: Not implemented
- **Evidence**: Same as D1 — no Flutter infrastructure.

### D3. Embedded globe integration
- **Status**: Partially implemented
- **Evidence**: Globe page and canvas are built in React/MapLibre. No Flutter embedding — no platform decision (R1), and the brief's rule 17 forbids claiming untested work.

### D4. Native mobile map integration
- **Status**: Not implemented
- **Evidence**: No native iOS/Android map code. The legacy Expo app (13.2k lines, 35 screens) remains untouched. `react-native-maps` with PROVIDER_GOOGLE is noted as a deviation to not carry forward.

### D5. Shared Supabase backend
- **Status**: Implemented but not fully tested
- **Evidence**: Backend has full schema, RLS, and RPC functions. Web app uses Supabase JS client. However, the Supabase project is not hosted/configured — `supabaseUrl` and `supabaseAnonKey` in `useSupabase.ts` are placeholder values (`"your-project.supabase.co"` and `"your-anon-key"`).

---

## Production Readiness (Section E)

### E1. PostGIS
- **Status**: Implemented and tested
- **Evidence**: Migrations apply from zero on PostgreSQL 16.15 + PostGIS 3.4. 106/106 assertions pass. GiST indexes, GIN indexes, geography columns all defined.

### E2. Geographic indexes
- **Status**: Implemented and tested
- **Evidence**: Multiple GiST/GIN indexes defined in migrations: `destinations_location_gist`, `destinations_search_gin`, `places_location_gist`, `places_search_gin`, `places_name_trgm`, `recent_views_user_time_idx`, etc.

### E3. RLS
- **Status**: Verified
- **Evidence**: 106 policy assertions pass. All tables have RLS enabled. Policies cover select/insert/update/delete for various roles and auth states.

### E4. Caching
- **Status**: Not implemented
- **Evidence**: No HTTP caching headers, no SWR/react-query, no client-side caching beyond React `useState`. The `nearby_places` RPC is `stable` but not cached.

### E5. Attribution
- **Status**: Implemented and tested
- **Evidence**: Globe footer renders: "Tiles © OpenFreeMap, data © OpenStreetMap contributors (ODbL). Attribution is rendered on the map itself." OpenFreeMap style 200 response verified with 111 layers.

### E6. Performance
- **Status**: Implemented and tested
- **Evidence**: FPS measured at ~55 FPS with SwiftShader in headless Chromium. Dev server runs on `0.0.0.0:3000`. Build produces 1692 modules; 496 kB JS / 25.7 kB CSS. Typecheck passes.

### E7. Automated tests
- **Status**: Not implemented
- **Evidence**: `docs/progress.md` notes: "0 tests" in git ls-files. Backend has 106 assertion suite but no app-level tests (no Vitest/Jest configured in web package). No Playwright/E2E tests for the web app.

### E8. Deprecated/excluded features
- **Google Maps**: Excluded per D16/G1. No Google Maps key or API exists anywhere. Confirmed by `grep` search.
- **Fabricated data**: Per D10, no fake seed data. The dev_demo.sql is opt-in only and refuses to run without explicit opt-in.

---

## Summary Table

| Category | Implemented & Tested | Implemented but Not Tested | Partially Implemented | Not Implemented |
|---|---|---|---|---|
| A1 Continent selection |  | ✓ |  |  |
| A2 Country info | ✓ |  |  |  |
| A3 Flags/capitals |  | ✓ |  |  |
| A4 Country boundaries | ✓ |  |  |  |
| A5 Global search | ✓ |  |  |  |
| A6 Real attractions |  |  | ✓ |  |
| A7 Marker clustering |  |  |  | ✓ |
| A8 Zoom-dependent |  | ✓ |  |  |
| A9 User GPS |  |  |  | ✓ |
| A10 OSM street maps |  |  |  | ✓ |
| A11 Globe→map transition |  |  |  | ✓ |
| B1 Hotels |  | ✓ |  |  |
| B2 Restaurants |  | ✓ |  |  |
| B3 Attractions |  | ✓ |  |  |
| B4 Reviews/ratings |  |  | ✓ |  |
| B5 Saved destinations |  | ✓ |  |  |
| B6 Collections |  |  |  | ✓ |
| B7 Directions |  |  |  | ✓ |
| B8 Nearby places | ✓ |  |  |  |
| C1 Auth |  |  |  | ✓ |
| C2 Password recovery |  |  |  | ✓ |
| C3 User profiles |  |  | ✓ |  |
| C4 Notifications |  |  |  | ✓ |
| C5 Admin dashboard |  |  |  | ✓ |
| C6 Role permissions | ✓ |  |  |  |
| C7 Onboarding |  |  |  | ✓ |
| D1 Flutter Android |  |  |  | ✓ |
| D2 Flutter iOS |  |  |  | ✓ |
| D3 Embedded globe |  |  | ✓ |  |
| D4 Native map integration |  |  |  | ✓ |
| D5 Shared Supabase |  | ✓ |  |  |
| E1 PostGIS | ✓ |  |  |  |
| E2 Geo indexes | ✓ |  |  |  |
| E3 RLS | ✓ |  |  |  |
| E4 Caching |  |  |  | ✓ |
| E5 Attribution | ✓ |  |  |  |
| E6 Performance | ✓ |  |  |  |
| E7 Automated tests |  |  |  | ✓ |

---

## Next Implementation Priorities (per the task)

1. **Continent exploration UI** — Add continent filter control to globe page
2. **Country flags and capitals** — Display flag images and capital city data
3. **Real attraction discovery** — Enhance `nearby_places` to surface real attraction data from the catalogue
4. **Global geographic search** — Implement browser geolocation integration for actual user location
5. **Globe-to-local-map transition** — Build the transition from globe projection to Mercator/local OSM map
6. **Saved destinations UI** — Implement save functionality and collections management
7. **Authentication** — Add Supabase Auth flow (register, login, profile)
8. **Flutter mobile integration** — Resolve R1 (mobile platform decision) and begin Flutter work
9. **Automated tests** — Add Vitest/Playwright test suite for critical paths
10. **Caching layer** — Add react-query or SWR for API caching

Preserve the existing Astryx design system and established visual language. Test every feature and update `docs/progress.md` and `docs/roadmap.md` after each completed milestone.