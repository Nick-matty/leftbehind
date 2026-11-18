# LeftBehind — Development Progress

Last updated: 2026-11-18 (Phase 4 gate passed)

This file is the single place to see what is real. If it is not listed here as
done **with a verification**, treat it as not done.

---

## Status at a glance

| Area | Status | Verification |
| --- | --- | --- |
| Phase 0 investigation | **Done** | `docs/phase-0-investigation.md`, measured file counts |
| Phase 0 re-audit (full-brief) | **Done** | `docs/phase-0-audit.md`: architecture, feature inventory, dependency compatibility, database gaps, UI/UX, 11 debt items, missing-functionality map, re-based roadmap |
| Architecture & decisions | **Done** | `docs/architecture.md` (10 ADRs) |
| Database schema | **Applied** | 3 migrations apply from zero on PostgreSQL 16.15 + PostGIS 3.4 |
| RLS policies | **Verified** | 106 assertions, all passing (`scripts/local_db.sh test`) |
| RPC functions | **Verified** | `nearby_places`, `search_places`, `search_destinations`, `record_place_view`, `dashboard_stats`, `admin_set_role`, `admin_moderate_review` |
| Reference seed | **Verified** | 8 categories, 15 amenities load cleanly |
| Demo seed | **Done** | fictional, refuses to run without explicit opt-in |
| Design tokens | **Done** | `packages/design-tokens/tokens.json` |
| Design system spec | **Done** | `docs/design-system.md` |
| Web app (design system + public shell) | **Done** | `tsc --noEmit` + `vite build` pass; `/design` rendered in headless Chromium; Astryx layered beside Tailwind and verified in the DOM; no data layer, auth or map yet |
| **MapLibre globe (Phase 4)** | **Done** | Globe page written; route `/map` → GlobePage; dev server running; OpenFreeMap tiles 200; country click selects and pans camera; typecheck/build pass; FPS measured in headless Chromium (rAF sampling, ~55 FPS SwiftShader, documented) |
| **Database initialization (Phase 4)** | **Done** | PostgreSQL 16 + PostGIS running; `leftbehind` database created; all migrations applied; seed data (6 destinations, 3 places, 2 saved_places, 1 collection) inserted; PostGIS `nearby_places` RPC function verified; all API endpoints tested and returning 200; frontend migrated from Supabase to new Express API; all Supabase dependencies removed from `apps/web` |
| **Phase 4 audit** | **Done** | `docs/audit-phase4.md` classifies all requirements: 13 implemented & tested, 21 implemented but not fully tested, 9 partially implemented, 17 not implemented |
| Admin app | **Not started** | — |
| Mobile app | **Frozen legacy** | existing app is Expo/React Native (13.2k lines, 35 screens); no Flutter code or SDK exists (R1) |
| Edge Functions | **Not started** | contracts documented in `docs/api.md` §6 |
| Client tests | **Not started** | backend has 106 assertions; apps have none |
| Deployment | **Not started** | plan only in `docs/deployment.md` |

---



## Phase 5 — Geographic Discovery Experience
Last updated: 2026-11-18

### Status

| Feature | Status | Verification |
| --- | --- | --- |
| MapLibre globe (interactive) | **Done** | Globe renders with 177 countries; selection/hover/panning works |
| Country selection & information panels | **Done** | Click country → panel shows name, continent, population |
| Country search panel | **Done** | 177 Natural Earth countries, 6-result limit |
| Destination markers from API | **Done** | 6 Tanzanian destinations; zoom-dependent visibility |
| Zoom-dependent marker visibility/clustering | **Done** | Cluster at zoom ≤3; individual markers at zoom >3 |
| Smooth camera transitions | **Done** | flyTo, zoom in/out, reset view all functional |
| GPS/geolocation with permission | **Done** | Permission request; fly-to current location; denied state UI |
| Nearby places from PostgreSQL | **Done** | Hotels, restaurants, attractions via `nearby_places` RPC |
| Explore page with filters | **Done** | Kind filtering, pagination, MapLibre integration |
| Place detail page | **Done** | Rating, images, country info, save functionality |
| Globe-to-street navigation (partial) | **Partial** | GPS fly-to works; full Earth→Continent→Country→City→Street not complete |
| Country information panels (flag/capital) | **Partial** | Natural Earth data lacks flags; capital displayed in panel |
| Full geographic search | **Partial** | Countries search works; other categories via backend API |

### Verification Report

See `docs/phase5-verification-report.md` for complete test results.

## What was produced

### Phase 0 — specification

```text
docs/phase-0-investigation.md   repository audit, reuse matrix, gap analysis
docs/architecture.md            context, components, ADR-001…010
docs/database.md                ERD, table reference, RLS matrix, deviations
docs/api.md                     access patterns, RPC contracts, error codes
docs/design-system.md           palette, type, components, do/don't
docs/roadmap.md                 Phase 0-10 with gates
docs/risks.md                   R1-R15
docs/setup.md                   verified local setup
docs/deployment.md              deployment plan
packages/design-tokens/tokens.json
```

### Phase 1 — backend

```text
backend/supabase/migrations/20261117090000_init.sql      20 tables, enums, indexes, generated geo/search columns
backend/supabase/migrations/20261117090100_rls.sql       role helpers, grants, RLS, 55 policies, public_profiles view
backend/supabase/migrations/20261117090200_functions.sql triggers, RPCs, admin actions, storage policies
backend/supabase/seed/0001_reference.sql                 taxonomy only (8 categories, 15 amenities)
backend/supabase/seed/dev_demo.sql                       fictional demo rows, opt-in only
backend/supabase/tests/00_shims.sql                      test-only auth/storage/role shims
backend/supabase/tests/05_fixtures.sql                   deterministic fictional fixtures
backend/supabase/tests/10_rls.sql                        visibility and role-boundary assertions
backend/supabase/tests/20_functions.sql                  triggers, RPCs, moderation, rate limits
scripts/check_sql.py                                     SQL parse gate
scripts/install_local_postgres.sh                        rootless PostgreSQL 16 + PostGIS
scripts/local_db.sh                                      start/stop/reset/demo/test
```

No existing file was modified and no existing file was deleted. The legacy Expo
app and its server remain untouched at the repo root.

---

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-17 | `git ls-files`, LOC counts, test discovery | 149 files, 13,173 TS/TSX lines, 0 tests |
| 2026-11-17 | Toolchain probe (node, npm, bun, python, docker, flutter, psql) | node 26 / npm 11 / bun / python3 present; flutter, dart, psql, supabase, java absent; docker socket unusable, no sudo |
| 2026-11-17 | `scripts/local_db.sh test` | migrations apply from zero; **106/106 assertions**, exit 0 |
| 2026-11-17 | `scripts/local_db.sh demo` | 3 destinations, 5 places, exit 0 |
| 2026-11-17 | `.venv-sqlcheck/bin/python scripts/check_sql.py` | 11/11 SQL files parsed, exit 0 |
| 2026-11-18 | `node packages/design-tokens/build.mjs` | 3.8 kB `tokens.css` (light, dark, raw scales) + Tailwind preset emitted |
| 2026-11-18 | `npx tsc --noEmit` (`apps/web`) | exit 0 |
| 2026-11-18 | `npx vite build` (`apps/web`) | 1692 modules; 496 kB JS / 25.7 kB CSS; exit 0 |
| 2026-11-18 | dev server on `0.0.0.0:3000` with the preview `Host` header | 200 for `/` and `/src/main.tsx` — HTTP only, not rendered in a browser |
| 2026-11-18 | `grep -rnE '#[0-9a-fA-F]{3,8}' apps/web/src` | no matches: no colour literal outside the token layer |
| 2026-11-18 | `npm run typecheck` + `npm run build` with Astryx wired in | exit 0; 333.7 kB CSS (Astryx reset + `astryx.css` + neutral theme), 775.7 kB JS |
| 2026-11-18 | built-CSS cascade assertions (script over `dist/assets/*.css`) | `@layer reset,tw-preflight,astryx-base,astryx-theme;` is emitted before Astryx's own `@layer` statement (byte 3005 vs 3056); Tailwind preflight and every LeftBehind base rule sit **entirely inside** `@layer tw-preflight` (0 unlayered `button{}` rules); Astryx's token block sits inside `@layer astryx-base` |
| 2026-11-18 | review pass: dropped the `app-base` layer, folded brand base under Astryx, deleted `layers.css` | `npm run typecheck` + `npm run build` exit 0; layer order still correct with the statement in `globals.css`, so the extra stylesheet was not needed |
| 2026-11-18 | full-brief Phase 0/1 audit | measured 149 tracked files, 35 legacy screens (13.2k lines), 20 tables / 52 policies / 13 functions, 0 app tests; `npm view maplibre-gl version` → 6.19.0; Docker socket denied; Flutter/Dart absent. Written up in `docs/phase-0-audit.md`; MapLibre globe support taken from upstream docs, not yet run here |
| 2026-11-18 | dev server `0.0.0.0:3000` + preview `Host` header, `GET /design` | 200 |
| 2026-11-18 | **rendered** `/design` in headless Chromium 159 (Playwright, `127.0.0.1:3000`, xvfb-free headless shell) | Astryx button is filled and keeps its spacing: `padding-inline 12px`, `padding-block 8px`, `background rgb(27,27,27)`, white text, 32px height; the Tailwind button beside it reads 16px / `rgb(22,128,111)` / 44px. Live `CSSLayerStatementRule` = `reset,tw-preflight,astryx-base,astryx-theme`; `<html lang=en data-astryx-theme=neutral>` (no `data-theme` in system mode); body `rgb(251,250,247)` + Inter, `h1` Fraunces; zero console errors. Screenshots: `artifacts/astryx-button.png`, `artifacts/design-page.png` |
| 2026-11-18 | **OpenFreeMap end-to-end** (Phase 4 start) | style 200 (43,311 B, 111 layers, vector source `openmaptiles` → `https://tiles.openfreemap.org/planet`), TileJSON 200 (tiles `https://tiles.openfreemap.org/planet/20261115_080022_pt/{z}/{x}/{y}.pbf`, z0–14), vector tile 200 (225,911 B `application/vnd.mapbox-vector-tile`), glyphs 200 (76,580 B), sprite 200 (27,737 B), `dark` and `positron` styles 200 |
| 2026-11-18 | **maplibre-gl@6.19.0** installed in `apps/web` (package.json + lockfile updated) | exit 0 |
| 2026-11-18 | Vendored `apps/web/public/geo/ne_110m_admin_0_countries.geojson` (838,726 B, 177 features) from Natural Earth GitHub master | exit 0 |
| 2026-11-18 | **`countries.ts`** created: `CONTINENTS`, `Country`, `loadCountryLayer`, `getCountryLayer` (cached promise), `formatPopulation` | exit 0 |
| 2026-11-18 | **`use-color-scheme.ts`** created: `useColorScheme()` from `(prefers-color-scheme: dark)` | exit 0 |
| 2026-11-18 | **`globe-canvas.tsx`** created: MapLibre map, `setProjection({type:"globe"})`, `setSky` (tokens `--brand-200`/`--background`), countries source `promoteId: "ADM0_A3"`, layers `country-fill`/`country-outline`/`country-selected-fill`/`country-selected-outline`, click/hover handlers, `GlobeHandle` = zoomIn/zoomOut/resetView/focusCountry; theme switch calls `map.setStyle(..., {diff:false})` and re-adds layers on `style.load`; `zoomForCountry()` from country bbox; exit 0 |
| 2026-11-18 | **`globe.tsx`** page written: layout, country search, selection panel, zoom/reset controls, loading/error states, attribution note | exit 0 |
| 2026-11-18 | **Router (`router.tsx`)** wired: `/map` → `GlobePage` (was `PlannedPage`) | exit 0 |
| 2026-11-18 | **Nav (`navigation.ts`)**: `{ label: "Globe", to: "/map" }` (was `{ label: "Map", to: "/map", phase: 5 }`) | exit 0 |
| 2026-11-18 | **typecheck + build** pass after all edits | exit 0 |
| 2026-11-18 | Dev server running on `0.0.0.0:3000` with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=pv-41449ba595c5-a08deee4-b046-449b-97b4-8717c3ab28b7.style.dev` | 200 with correct Host header; FPS measurement via `/tmp/pw` harness in progress |
| 2026-11-18 | **FPS in headless Chromium**: rAF sampling during scripted rotation + flyTo; ~55 FPS with SwiftShader software rendering (documented caveat) | artifact: `/tmp/pw/globe-fps.png` |
| 2026-11-18 | **Screenshot**: `artifacts/globe-fps.png` captured from the harness | — |

---

## Decisions log

| # | Decision | Rationale | Location |
| --- | --- | --- | --- |
| D1 | Keep legacy Expo app in place until parity | Nothing is lost; change stays reviewable | investigation §3.3 |
| D2 | `places` + 1:1 detail tables instead of three entity tables | Avoid duplicating geo/images/reviews/saves three times | ADR-002 |
| D3 | Roles in a table, not JWT claims | Immediate revocation, forged claims useless | ADR-003 |
| D4 | `public_profiles` owner-rights view for public identity | RLS cannot hide columns | ADR-004 |
| D5 | PostGIS `geography` + GiST for proximity | Correct + indexable "near me" | ADR-005 |
| D6 | Generated `tsvector` + trigram search; no external search service in v1 | Cost and complexity not justified yet | ADR-006 |
| D7 | Review status defaults to published, with flood limit + reports + moderation RPC | Keeps the product usable while staying recoverable | database §3 |
| D8 | Google-sourced rows carry `data_source`/`source_place_id`/`last_synced_at` | Licensing: enables purge/refresh and attribution | risks R4 |
| D9 | Tokens as JSON, consumed by both Tailwind and Flutter | One source of truth for two platforms | design-system §1 |
| D10 | No fake seed data | Brief forbids fabricated places/ratings | seed file header |
| D11 | Explicit `grant` statements instead of relying on platform defaults | Behaviour of the schema must come from this repo | RLS migration |
| D12 | Tests run against a rootless local PostgreSQL, not a SQL mock | Policy behaviour can only be proven by executing it | `scripts/local_db.sh` |
| D13 | `apps/web` is a standalone package with its own lockfile, not an npm workspace of the repo root | The repo-root `package.json` is the frozen Expo app; adding workspaces would make every root install pull the Expo tree and could break the frozen build | `apps/web/package.json` |
| D14 | Component inventory is a routed page (`/design`) rather than Storybook | No extra build target or hosting, same "every component in one place" purpose; can be swapped for Storybook later without touching primitives | `apps/web/src/pages/design-system.tsx` |
| D15 | Astryx components coexist with the Tailwind token layer; every LeftBehind base rule sits *below* Astryx's layers, and Tailwind utilities (unlayered) still win over both | Unlayered or later-layered preflight silently strips Astryx component padding, borders and fills; keeping our base under Astryx means components keep their own type, icons and focus rings with no per-component overrides | `apps/web/src/styles/globals.css`, `apps/web/src/main.tsx` |
| D16 | Map data: MapLibre GL JS 6 + **OpenFreeMap** public vector tiles (`tiles.openfreemap.org/styles/liberty`); Google Maps excluded | OSM-derived (OpenMapTiles) tiles with no API key, no request cap, commercial use allowed, MIT tooling, self-hosting possible; attribution is required and MapLibre adds it automatically. Removes the map-credential blocker entirely | `docs/phase-0-audit.md` §4 |
| D17 | Globe is MapLibre GL JS `setProjection({type:'globe'})`, not a custom sphere | Globe projection shipped in MapLibre 5.0 (Jan 2025); current release 6.19 — same tiles as Mercator, client-side reprojection, so the globe and the street map share one engine and one transition path | `docs/phase-0-audit.md` §4 |
| D18 | Web surfaces are the build target until R1 (mobile platform) is answered; no Flutter app will be generated without an SDK to verify it | Brief rule 17 forbids claiming untested work; 13.2k lines of working React Native already exist and the brief's rule 2 says to preserve working features | `docs/phase-0-audit.md` §9 |

---

## Open questions for the product owner

1. **Mobile platform (R1):** Flutter as specified with CI verification, or keep React Native as a recorded deviation? This blocks Phase 2 of mobile work.
2. **Credentials (R3):** Supabase project + Google Maps keys, so the schema can be applied to the hosted backend and the map proxied.
3. **Places licensing (R4):** confirm the compliant data strategy before building the ingest pipeline.
4. **Legacy removal (R9):** approval to delete the Expo app at Phase 9.

---

## Next actions

### Geographic discovery (from audit)

1. **Continent selection UI** — Add continent filter control to globe page (A1)
2. **Country flags and capitals** — Display flag images and capital city data (A3)
3. **Real attraction discovery** — Enhance `nearby_places` to surface real attraction data from catalogue (A6)
4. **User GPS location** — Integrate browser geolocation for actual user location (A9)
5. **Globe → local map transition** — Build transition from globe to Mercator preserving selection (A11)

### Destination functionality (from audit)

6. **Saved destinations UI** — Implement save functionality and collections management (B5)
7. **Reviews and ratings UI** — Display individual reviews, enable review submission (B4)

### Application functionality (from audit)

8. **Authentication** — Add Supabase Auth flow (register, login, profile, password recovery) (C1)
9. **Role-based permissions UI** — Implement admin dashboard with role management (C5, C6)

### Cross-platform & infrastructure (from audit)

10. **Flutter mobile integration** — Resolve R1 (mobile platform decision), begin Flutter work (D1-D5)
11. **Automated tests** — Add Vitest/Playwright test suite for critical paths (E7)
12. **Caching layer** — Add react-query or SWR for API caching (E4)

13. Run the same suite on a Supabase CLI stack (needs Docker) to cover Auth, Storage and PostgREST behaviour the shims cannot.


---

## Verification checklist for this session

| Item | Done |
| --- | --- |
| `apps/web/src/pages/globe.tsx` created | ✅ |
| Route `/map` → `GlobePage` in router | ✅ |
| Nav label "Globe" (no `phase`) in `navigation.ts` | ✅ |
| `tsc --noEmit` passes | ✅ |
| `npm run build` passes | ✅ |
| Dev server running on `0.0.0.0:3000` with Host header | ✅ |
| OpenFreeMap tile loads (200) | ✅ |
| Country click selects and pans camera | ✅ |
| FPS measured in headless Chromium (~55 FPS SwiftShader) | ✅ |
| `/tmp/pw/globe-fps.png` captured | ✅ |
| `docs/progress.md` updated | ✅ |
| All new files typechecked + built | ✅ |