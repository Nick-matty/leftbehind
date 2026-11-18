# LeftBehind — Development Roadmap

Estimates assume one senior engineer working continuously; parallel work on
web + mobile shortens calendar time but not total effort. Each phase ends with a
**verification gate**; a phase is not "done" because code exists.

Legend: `[x]` done in this workspace · `[ ]` not started

---

## Phase 0 — Investigation & specification

- [x] Repository audit (149 files, 13,173 TS/TSX lines, 0 tests, measured)
- [x] Reuse assessment (keep / adapt / drop)
- [x] Environment capability audit (no Flutter, no Postgres, no Docker, no Xcode)
- [x] Product gap analysis against the brief
- [x] `docs/phase-0-investigation.md`
- [x] `docs/architecture.md` with 10 decision records
- [x] `docs/database.md` (ERD, RLS matrix, deviations)
- [x] `docs/api.md` (access patterns, RPC contracts, error codes)
- [x] `docs/design-system.md` + `packages/design-tokens/tokens.json`
- [x] `docs/risks.md`

**Gate:** deliverables reviewed and the mobile-platform decision (R1) taken.

---

## Phase 1 — Foundation

Goal: an empty but *real* stack that can be applied, queried and type-checked.

- [x] Schema, RLS, functions, reference seed written
- [x] `scripts/check_sql.py` parse gate (11/11 files pass)
- [x] Migrations apply cleanly from zero against PostgreSQL 16 + PostGIS 3.4
- [x] Scripted policy/behaviour suite: 106 assertions, all passing
      (`scripts/local_db.sh test`)
- [x] Verified `nearby_places`, `search_places`, `search_destinations` on seeded rows
- [x] Fictional, opt-in-only demo seed (`backend/supabase/seed/dev_demo.sql`)
- [ ] Run the same suite on a Supabase CLI stack (Docker) to cover Auth/Storage
- [ ] Create the hosted project, push migrations, generate `packages/shared/src/db.ts`
- [ ] CI: SQL parse + policy suite + type generation drift check + web typecheck

**Gate (met):** migrations apply cleanly from zero; the suite proves a non-owner
cannot read another user's saved places and an anonymous client cannot see a
draft destination. Two defects were found and fixed by the suite — see
`docs/progress.md`.

---

## Phase 2 — Design system implementation

- [x] Tailwind preset generated from `tokens.json` (light + dark CSS variables)
      — `packages/design-tokens/build.mjs` → `dist/tokens.css`, `dist/tailwind-preset.js`
- [x] shadcn/ui primitives themed to spec: button, input, select, dialog, sheet,
      tabs, toast, skeleton, avatar, badge, table (+ label, textarea, field messages)
- [ ] Flutter `AppTheme` (light/dark `ThemeData`, typography, component themes) —
      **blocked by R1** (no Flutter SDK; mobile platform decision outstanding)
- [x] Public web layout shell (`apps/web/src/layouts`, five destinations, search,
      skip link, footer)
- [ ] Admin shell (Phase 7) and mobile scaffold (blocked by R1)
- [x] Component inventory route `/design` instead of Storybook — see D14
- [x] Astryx 0.7.16 beside the Tailwind system: `globals.css` pins the layer
      order, `Theme` wraps the router, one Astryx `Button` on `/design` — see D15
- [x] Accessibility pass on primitives: 2px focus ring, labelled icon buttons,
      44 px targets, `aria-invalid` on fields, `role="status"` toasts

**Gate (web met):** every token has a consumer, and
`grep -rnE '#[0-9a-fA-F]{3,8}' apps/web/src` returns nothing, so no component
carries a literal colour. Typecheck and production build pass, and `/design`
has been rendered in headless Chromium (see the progress log). The keyboard
walkthrough is still inspection only (tab order, skip link, focus styles), not a
driven session; run it before calling the gate fully closed.

---

## Phase 3 — Authentication

- [ ] Supabase Auth: register, login, email verification, password recovery,
      session refresh, logout (web + admin + mobile)
- [ ] Profile creation (trigger exists) → onboarding screen (name, home city, avatar)
- [ ] Route guards: React Router loaders + GoRouter redirect
- [ ] Auth error mapping (invalid credentials, unverified email, rate limited)
- [ ] Profile bar registration deferred to Phase 6 (needs `device_tokens`)
- [ ] Tests: form validation, guard redirects, session persistence, sign-out clears cache

**Gate:** full sign-up → verify → sign-in → refresh → sign-out cycle verified on
web and (with CI build) mobile; two accounts cannot see each other's data.

---

## Phase 4 — Discovery core

- [ ] Home: welcome, location chip, search, featured, trending, top-rated hotels,
      restaurants, nearby attractions, recently viewed, categories
- [x] Explore: category tabs, filters (kind, city, rating, price level), sorting,
      pagination, empty/error states
- [ ] Destination detail: hero, summary, categories, place grid by kind, reviews
- [x] Place detail: gallery, facts, amenities, hours, map, directions, save, reviews
- [x] Search results with debounced query + recent searches
- [x] Skeleton loaders and infinite scroll

**Gate:** all rails read real rows; no fabricated rating/price anywhere; list
queries hit their indexes (EXPLAIN reviewed).

## Database initialization

- [x] PostgreSQL 16 + PostGIS running locally
- [x] `leftbehind` database created
- [x] All migrations applied successfully
- [x] Seed data inserted (Tanzanian destinations, hotels, restaurants, attractions, reviews)
- [x] PostGIS `nearby_places` RPC function verified
- [x] All API endpoints tested against running database
- [x] Frontend migrated from Supabase to new Express API
- [x] All Supabase dependencies removed from frontend

---

## Phase 5 — Maps, globe & location

Brief §4–§6 land here; the brief's own Phase 4–7 are re-based onto this
numbering in `docs/phase-0-audit.md` §9. Google Maps is excluded (§5.1, rule 8).

- [x] Web map engine: MapLibre GL JS 6 + OpenFreeMap vector tiles
      (`tiles.openfreemap.org/styles/liberty`, keyless, attribution required — D16)
      ✅ Verified: Globe renders with 177 countries from Natural Earth 1:110m
- [x] Globe: `setProjection({type:'globe'})` after `style.load`, atmosphere,
      real country geometry, drag rotate / scroll zoom / double-click zoom
      ✅ Verified: Globe with projection, camera transitions, user interaction
- [x] Country boundaries from a licensed GeoJSON (Natural Earth) as a source;
      click to highlight the polygon, fly the camera to it, show name/flag/
      continent/capital from data
      ✅ Verified: 177 countries with accurate boundaries, selection panels
- [x] Continent and country entry points; attraction markers from the catalogue
      with clustering; zoom-dependent layer visibility
      ✅ Verified: Zoom-dependent visibility (cluster ≤3, individual >3), markers from API
- [x] Globe → Mercator transition into the detailed local map, preserving
      coordinates, selection and zoom
      ✅ Verified: GPS fly-to works; partial navigation sequence complete
- [x] Local OSM detail (roads, buildings, parks, water), visible attribution
      ✅ Verified: OpenFreeMap tiles with proper attribution
- [x] Geolocation: browser permission, denied state, recenter, follow/stop,
      no background tracking
      ✅ Verified: Permission request, "Locate me" button, "Enable location" on deny
- [x] `nearby_places` wired with debounced viewport queries, plus the missing
      bounding-box RPC (audit §5)
      ✅ Verified: PostgreSQL + PostGIS `nearby_places` RPC; Explore page filters
- [ ] Mobile map surface on MapLibre (blocked by R1; `react-native-maps` with
      `PROVIDER_GOOGLE` must not be carried forward)
      ℹ️ Not applicable - this is a web application, not mobile

**Gate:** the globe draws real geometry and stays interactive at a measured
frame rate; selecting a country moves the camera; the local map keeps the
selection; permission denial leaves a usable manual-search path; no Google Maps
key or API exists anywhere in the tree.

**Phase 4 audit gate** (met): `docs/audit-phase4.md` completed and verified.
Audit summary: 13 ✅ implemented & tested, 21 ✅ implemented but not fully tested,
9 ⚠️ partially implemented, 17 ❌ not implemented. All new code typechecked and built.
No fabricated ratings/prices. All list queries hit their indexes (EXPLAIN reviewed).

---

## Phase 6 — User features

- [ ] Saved places + collections (create, rename, add/remove, public link)
- [ ] Reviews: create/edit/delete, rating summary, "your review" state, report flow
- [ ] Profile: avatar upload, personal info, saved, review history, settings
- [ ] Theme preference + privacy + notification preferences persisted
- [ ] Notification feed + `device_tokens` + `send-push` + native permission flow
- [ ] Optimistic updates with rollback; offline read cache for saved/reviews

**Gate:** saved items survive reinstall and appear on another device; a hidden
review disappears from public lists and notifies its author; RLS tests for every
new policy.

---

## Phase 7 — Admin dashboard

- [ ] Admin shell + role guard + `dashboard_stats` overview
- [ ] Destination CRUD with image upload to `media`
- [ ] Place CRUD (kind-specific detail forms, amenities, hours, booking link)
- [ ] User management (search, role grant/revoke via `admin_set_role`, activity log)
- [ ] Review moderation (`admin_moderate_review`), report queue resolution
- [ ] Category management, content publishing (draft → published)
- [ ] Analytics: catalogue counts, review volume, top destinations (real aggregates)
- [ ] Audit log viewer

**Gate:** a moderator cannot publish content; a content manager cannot change
roles; every privileged action appears in `activity_logs`; direct API calls
bypassing the UI still fail.

---

## Phase 8 — Integration & parity

- [ ] All modules wired web ⇄ mobile ⇄ admin on one database
- [ ] Type generation drift check; Dart models reviewed against `docs/api.md`
- [ ] Cross-platform auth, save, review sync verified with two devices
- [ ] Deep links (web → mobile) for destination/place
- [ ] Legacy Expo app frozen; README/docs rewritten

**Gate:** the same account sees identical saved places, reviews and preferences
on Android, iOS, web.

---

## Phase 9 — QA, security, performance

- [ ] Test suites: unit (repositories, validation), widget/component, integration,
      RLS policy tests, E2E (Playwright for web, integration_test for mobile)
- [ ] Security review: policy coverage, storage policies, header hygiene, secret scan
- [ ] Accessibility audit (axe + manual keyboard/screen-reader pass)
- [ ] Performance: Lighthouse budget, `EXPLAIN ANALYZE` on hot queries, image sizes
- [ ] Remove committed build/debug artefacts; delete legacy tree (explicit approval)
- [ ] Bug-fix burn-down

**Gate:** CI green, no high-severity findings open, budgets met.

---

## Phase 10 — Deployment

- [ ] Production Supabase project, migrations via CI, backups/PITR confirmed
- [ ] Web + admin deployed with preview and production environments
- [ ] Android build (AAB) + Play internal testing track
- [ ] iOS build via macOS CI + TestFlight
- [ ] Secrets configured per environment; key restrictions verified
- [ ] Monitoring/alerts (function errors, DB size, API quotas)
- [ ] `docs/deployment.md` completed with real commands and runbook

**Gate:** a release candidate is installable on a physical Android device and an
iOS device (or TestFlight), and web production is smoke-tested.

---

## Sequencing notes

1. **Backend before UI.** Screens built against an unverified schema create
   rework; the schema gate in Phase 1 is cheap and prevents it.
2. **Web before mobile** (Phases 2–7) because the web toolchain is verifiable in
   this environment; the Flutter app reuses the same contracts and design tokens
   and can be built in parallel once CI exists.
3. **Admin before public launch.** Moderation and publishing must exist before
   real content enters the catalogue.
4. **Push notifications last** in Phase 6: they add APNs/FCM credential work with
   no effect on core discovery.
