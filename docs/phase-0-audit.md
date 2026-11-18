# LeftBehind — Phase 0 Audit (2026-11-18)

Re-audit of the working tree against the full product brief (§1–§14).
Supersedes the factual sections of `phase-0-investigation.md` (2026-11-17), which
was written before `apps/web`, `packages/design-tokens` and `backend/supabase`
existed. Design rationale and ADRs stay in `architecture.md`; this document is
the measured state of the repository today.

Method: file listing, `git ls-files`, dependency and lockfile inspection, direct
greps over migrations, screens and manifests, one live browser render of the web
app, and a flow probe of the toolchain. Nothing below is inferred from the brief.

---

## 1. Repository at a glance

| Metric | Value | How measured |
| --- | --- | --- |
| Committed files | 149 | `git ls-files \| wc -l` |
| Commits | 1 (`ac08c6d`, "Initial commit") | `git log` |
| Working-tree changes | `.gitignore`, `README.md` modified; `apps/`, `backend/`, `docs/`, `packages/`, `scripts/`, `artifacts/`, `.env.example` untracked | `git status` |
| Legacy mobile app | 35 Expo Router screens, ~13,200 TS/TSX lines, 18 tool screens, 6 Zustand stores | file counts |
| Legacy sync server | Express 4 + Prisma, 889 lines, 4 route modules | `server/` |
| Web app | 26 source files, 5 routes, 1 design-system route | `apps/web/src` |
| Database | 20 tables, 52 policies, 13 functions, 3 migrations | grep over `backend/supabase/migrations` |
| Backend verification | 106 assertions, 11/11 SQL files parsed (2026-11-17) | `scripts/local_db.sh test` |
| Automated app tests | **0** | no `*.test.*` / `*.spec.*` outside `node_modules` |
| CI | **none** | no `.github/workflows` |
| Documentation | 10 markdown files in `docs/` | listing |

Toolchain actually present: node 26.13.0, npm 11.20.0, bun 1.4.4, python3 3.12,
git, curl. **Absent:** Flutter, Dart, `psql`, Supabase CLI. Docker 29.1.3 is
installed but `/var/run/docker.sock` is permission-denied, so no container in
this environment. No system fonts or fontconfig (affects headless rendering only).

---

## 2. Architecture report

Four independent codebases live in one repository. This is the single most
important structural fact for the rebuild.

| Unit | Technology | State | Role in the target product |
| --- | --- | --- | --- |
| `app/`, `src/`, `server/`, root `package.json` | Expo SDK 54 / RN 0.81 / React 19, Expo Router, Zustand, Prisma+Express | Complete, offline-first **packing companion** | Legacy. Frozen until parity (D1). Source of transferable security utilities only. |
| `apps/web` | Vite 6 + React 19 + TypeScript + Tailwind 3.4 + **Astryx 0.7.16** | Public shell + design system, no data layer | The web client the brief's §3 and §4.2 apply to. |
| `packages/design-tokens` | `tokens.json` → generated CSS vars + Tailwind preset | Complete for web; Flutter emitter not written | Cross-platform token source (D9). |
| `backend/supabase` | 3 SQL migrations + 2 seeds + SQL test suites | Applied and policy-tested against real PostgreSQL 16 + PostGIS 3.4 | The single backend (D2–D8). No hosted project yet. |

Two artefacts contradict the brief and must be resolved rather than ignored:

1. **There is no Flutter code and no Flutter toolchain.** The brief's mobile
   requirement (§4.2, Part 12 Phase 2) assumes a Flutter app; the repository's
   only mobile app is Expo React Native, with 13k lines of working screens.
2. **The legacy app is Google-Maps-shaped.** `react-native-maps` with
   `PROVIDER_GOOGLE`, `app.json` carries `googleMapsApiKey` placeholders, and
   `.env.example` has three Google Maps keys. The brief forbids Google Maps
   (§5.1, rule 8). The legacy app is frozen, so this is a migration item for
   whichever mobile path is chosen — not a change to make silently.

---

## 3. Existing feature inventory

Classification per brief §1.2. "Unverified" means it cannot be executed here
(no emulator, no device, no Metro run), which is not the same as working.

### 3.1 Legacy mobile app (`app/`, `src/`)

| Feature | Files | Class | Notes |
| --- | --- | --- | --- |
| Onboarding | `app/onboarding.tsx` (114) | 1 Fully functional | Local flag only |
| Register / login / forgot password | `app/auth/*.tsx` (1,050) | 2 Partially functional | Device-local PBKDF2-HMAC-SHA256 (100k), encrypted AsyncStorage. **Accounts never reach a server**, so they cannot be shared across devices — the brief's §3.1 is not met by them |
| Session + PIN lockout | `src/store/authStore.ts`, `securityStore.ts` | 1 Fully functional | Exponential backoff, secure-store key |
| Home dashboard | `app/(tabs)/index.tsx` (270) | 3 UI-only | Trip/packing dashboard, not destination discovery |
| Trips / sessions | `app/(tabs)/trips.tsx`, `app/session/*` | 1 Fully functional (local) | |
| Calendar + budget | `app/(tabs)/calendar.tsx` (359) | 1 Fully functional (local) | |
| **Map / places** | `app/(tabs)/map.tsx` (203) | **3 UI-only / placeholder** | `PLACES_API_CONFIGURED = false`; renders `DEMO_PLACES` with invented names and ratings. Explicitly flagged in a code comment as awaiting a Places key |
| Web map fallback | `app/(tabs)/map.web.tsx` (32) | 3 UI-only | Deliberate stub: `react-native-maps` has no browser implementation |
| Profile | `app/(tabs)/profile.tsx` (955) | 2 Partially functional | Largest screen; mostly local settings |
| 18 travel tools (baggage, currency, sos, vault, phrasebook, packing, timeline…) | `app/tools/*.tsx` (~2,000) | 1–2 Mixed | Local-only, several depend on live rates/weather feature modules that degrade without keys |
| Encrypted document vault | `app/tools/vault.tsx`, `src/features/cloud/*` | 1 Fully functional | AES-256-GCM, jail-monkey, screen-capture block |
| i18n | `src/i18n/translations.ts` (424) | 1 Fully functional | Untranslated extras |
| Cloud sync (E2EE) | `server/` + `src/features/cloud/*` | 2 Partially functional | Server is SQLite by default; no deployment |
| Liquid-glass design system | `src/utils/theme.ts` | 6 Obsolete for this product | Explicitly banned by the brief |

### 3.2 New web app (`apps/web`)

| Feature | Files | Class |
| --- | --- | --- |
| Design tokens (light/dark) | `packages/design-tokens/*` | 1 Fully functional (verified) |
| Astryx theme mount + layered cascade | `src/main.tsx`, `src/styles/globals.css` | 1 Fully functional (verified in a real browser) |
| 13 primitives + empty state | `src/components/ui/*` | 1 Fully functional (inventory route renders) |
| Public shell (header, footer, skip link, 5 destinations, search box) | `src/layouts/*` | 1 Fully functional |
| `/design` inventory | `src/pages/design-system.tsx` | 1 Fully functional |
| Home | `src/pages/home.tsx` | 3 UI-only — honest empty states, no data |
| Explore / Map / Saved / Profile routes | `src/pages/planned.tsx` via router | 4 Broken-by-design placeholders ("ships in Phase N") — the brief requires these to be real |
| Auth, data access, maps, globe, reviews, admin | — | 5 Missing |

### 3.3 Backend

| Feature | Class | Notes |
| --- | --- | --- |
| Schema (20 tables), RLS (52 policies), RPCs (13) | 1 Fully functional (tested) | PostGIS geography, generated `tsvector`, roles in `user_roles` |
| Reference seed | 1 Fully functional | taxonomy only, no invented places |
| Demo seed (fictional) | 1 Fully functional | opt-in only |
| Hosted project | 5 Missing | no Supabase URL/keys (R3) |
| Auth (Supabase Auth) | 5 Missing | no client wired |
| Edge Functions | 5 Missing | contracts documented only |
| Country boundary / OSM data ingest | 5 Missing | new requirement (§5, §7) |
| Admin app | 5 Missing | Phase 7 in `roadmap.md`, no code |

---

## 4. Dependency compatibility report

| Dependency | Version | Compatible with the plan? | Evidence |
| --- | --- | --- | --- |
| `@astryxdesign/core` / `theme-neutral` / `cli` | 0.7.16 (fixed group) | **Yes, web only** | React 19 peer; precompiled CSS (no StyleX build step needed); CLI non-interactive. Not usable in RN/Flutter — native equivalents must be written |
| `@stylexjs/stylex` | 0.19.2 | Yes (invisible) | Only a peer; core ships `dist/astryx.css` |
| React | 19.1.0 both apps | Yes | Legacy RN app also React 19 |
| Vite | 6.4.6 | Yes | `npm run build` passes; CSS layer order verified in `dist` |
| Tailwind | 3.4 | Yes, layered | preflight placed in `@layer tw-preflight` below `astryx-base`; verified rendered |
| **MapLibre GL JS** | **6.19.0 available** | **Yes, web** | Globe projection shipped in 5.0.0 (Jan 2025); `setProjection({type:'globe'})` after `style.load`. Not yet installed |
| MapLibre Native / `maplibre-react-native` | — | Not evaluated in this environment | No device/emulator; must be verified before Phase 6 mobile work |
| `react-native-maps` 1.20.1 | in legacy app | **Conflicts with rule 8** on Android (`PROVIDER_GOOGLE`) | Must not be carried into the new mobile surface |
| Flutter / Dart | **not installed, no code** | **Unknown / blocked** | No `pubspec.yaml`, no SDK; cannot validate a Flutter build here |
| Docker | 29.1.3, socket denied | **Blocked** | Cannot run `supabase start`; hosted project or CI is the only path to Auth/Storage testing |

Map data source decision (new, §5.1): **OpenFreeMap public instance**
(`https://tiles.openfreemap.org/styles/liberty`) — OSM-derived vector tiles via
OpenMapTiles, no API key, no registration, no request cap, commercial use
allowed, MIT tooling, attribution auto-added by MapLibre. Self-hosting is
supported if the public instance ever becomes unacceptable. Recorded as D16.
This removes the credential blocker the previous plan had for maps; no Google
Maps key is needed anywhere.

---

## 5. Database analysis

Measured from the migrations (not from the design docs):

- 20 tables in one canonical `places` table design with 1:1
  `hotel_details` / `restaurant_details` / `attraction_details` (D2).
- 52 RLS policies; roles are rows in `user_roles` resolved by SECURITY DEFINER
  helpers, not JWT claims (D3).
- 13 functions, including `nearby_places`, `search_places`,
  `search_destinations`, `record_place_view`, `dashboard_stats`,
  `admin_set_role`, `admin_moderate_review`.
- PostGIS `geography(Point,4326)` + GiST index for radius search (D5); generated
  `tsvector` + trigram for text search (D6).
- Verified by executing: 106 assertions across RLS, triggers, RPCs, moderation
  and rate limits, on a throwaway PostgreSQL 16.15 + PostGIS 3.4 cluster
  (`scripts/local_db.sh test`, exit 0).

Gaps relative to the new brief:

| Requirement | Status |
| --- | --- |
| Countries / continents as first-class rows with boundaries | **Missing** — no `countries` table, no polygon geometry |
| Country boundary dataset for the globe | **Missing** — needs a licensed GeoJSON (e.g. Natural Earth) ingest, not hand-drawn polygons |
| OSM/POI linkage (`osm_type`, `osm_id`) | Partially — `places` has `data_source`/`source_place_id` (D8) but no OSM id columns |
| Bounding-box query for viewport loading | **Missing** — radius and text search exist, bbox does not |
| Continent / country aggregation for zoom levels | **Missing** |
| Everything else (places, hotels, restaurants, attractions, reviews, saves, collections, roles) | Present and tested |

No database has been reset or migrated in this audit. The local cluster is
throwaway; there is no production database to damage.

---

## 6. UI/UX assessment

What is genuinely good: the web shell already reads as a travel product —
Fraunces display type, restrained clay/brand palette, opaque surfaces, a 2px
focus ring, honest empty states that say "nothing is published yet" instead of
inventing content. The `/design` inventory proves every token has a consumer and
no component carries a literal colour. The layer discipline means Astryx
components and Tailwind utilities coexist without one silently gutting the other.

What is missing or weak:

1. **No photography.** Every surface is type-only because the catalogue is
   empty. High-quality destination imagery is a brief requirement (§2.4) and
   must come from real, licensed sources tied to real rows — not stock filler.
2. **Two visual languages coexist.** Astryx neutral (Figtree, 32px controls) and
   the LeftBehind token layer (Inter/Fraunces, 44px controls) render side by
   side. That is fine for a foundation check, not for a product: per §2.3 the
   app must present one identity. Decision needed on which control scale wins.
3. **The legacy mobile UI is liquid glass**, which §2.4 bans outright. Any
   reuse of its screens is styling work, not copy-paste.
4. **No dark-mode switch** — dark is only `prefers-color-scheme`. §3.8 wants a
   theme preference per account.
5. **No motion system in practice** — tokens exist, nothing uses them.

---

## 7. Technical debt report

| # | Debt | Severity | Action |
| --- | --- | --- | --- |
| T1 | No CI; 106 backend assertions only run when a human runs them | High | Add workflow (offered earlier, still not built) |
| T2 | No app tests anywhere (`apps/web`, legacy) | High | Vitest + Playwright once there is behaviour worth testing |
| T3 | Legacy debug residue is **tracked** in Git (`_cdp_*`, `_chrome_*`, `_web_*`, `_term_snip.txt`, `dist-sdk54-check/`) although now gitignored | Medium | `git rm --cached` in a dedicated cleanup commit — needs owner approval since it rewrites tracked files |
| T4 | `.env.example` still documents Google Maps keys the brief forbids | Medium | Rewrite when the map provider is wired (D16) |
| T5 | No hosted Supabase project; Auth/Storage/PostgREST behaviour unverified (local shims only) | High (blocking) | Owner must create project + keys (R3) |
| T6 | Docker socket denied → cannot run the Supabase CLI stack locally | Medium | CI with Docker, or accept hosted-only testing |
| T7 | Token layer has no Flutter emitter; D9 claims cross-platform | Medium | Only matters once R1 is answered |
| T8 | Six colliding custom-property names between Astryx and `tokens.css` (`--duration-fast`, `--duration-slow`, `--ease-exit`, `--ease-standard`, `--radius-full`) | Low | Ours win as unlayered; Astryx components inherit LeftBehind timings. Document or rename |
| T9 | Web app has no code splitting; one 776 kB JS chunk (Astryx is most of it) | Medium | Route-level `import()` before Phase 9 measurements |
| T10 | No admin surface at all, though the DB already has admin RPCs | High (feature gap) | Phase 8 |
| T11 | `packages/design-tokens/dist` is generated but required for build; a fresh clone fails until `npm run tokens` | Low | Already handled by `predev`/`prebuild`; document for CI |

Reported, not fixed: T3 and T4 change tracked/committed files and belong in the
owner's review, not in an audit commit.

---

## 8. Missing functionality (mapped to the brief)

| Brief section | Status |
| --- | --- |
| §3.1 Authentication (server-side, shared across devices) | Missing on web and mobile; legacy auth is device-local and cannot migrate (R10) |
| §3.2 Home dashboard with real content | Shell only, no data |
| §3.3 Explore + search/filter/sort | Route placeholder |
| §3.4 Hotels, §3.5 Restaurants, §3.6 Attractions | Schema exists, no UI, no images, no data |
| §3.7 Saved places / collections | Schema + RLS exist, no UI |
| §3.8 Profiles | Route placeholder |
| §3.9 Reviews | Schema, RPCs, moderation tested; no UI |
| §3.10 Admin | DB RPCs exist; no app |
| Part 4 (3D globe) | **Nothing exists.** No MapLibre, no WebGL surface, no country data |
| Part 5 (OSM local maps, geolocation) | Legacy has an expo-location map with placeholder pins; web has none |
| Part 6 (globe → local transition) | Nothing |
| Part 8 (performance) | Unmeasured; no baseline exists yet |
| Part 10 (security, a11y) | DB side strong (RLS tested); client side has focus ring + labels only |
| Part 11 (testing) | Backend only |

---

## 9. Roadmap (brief's phases, re-based on reality)

| Phase | Content | Status | Blocker |
| --- | --- | --- | --- |
| 0 | This audit + reports | **Done** | — |
| 1 | Architecture & compatibility (framework, Astryx, StyleX, MapLibre, tile provider) | **Done in this document** — Astryx verified locally by build + render; MapLibre 6.19 + globe taken from upstream docs, **not yet exercised in this app**; OpenFreeMap chosen (D16); Flutter unverifiable here | R1 for mobile |
| 2 | Astryx design system as the base | **Mostly done** for web (tokens, 13 primitives, shell, layered coexistence verified). Remaining: fold Astryx primitives into the product screens, decide the single control scale, dark-mode switch | Design decision on control scale |
| 3 | Core app: auth, home, explore, profile, saved, place details | **Not started** | R3 (Supabase project + keys) |
| 4 | Globe foundation: real Earth, rotate/zoom/select country | **Not started** — no credentials needed with D16, can start immediately | — |
| 5 | Global discovery: countries, markers, clustering, search-to-place | Not started | Needs country boundary + place data (Phase 3/5 ingest) |
| 6 | OSM local maps, geolocation, nearby | Not started | Browser geolocation works on web; mobile needs R1 |
| 7 | Globe → local map handoff | Not started | After 4–6 |
| 8 | Remaining product: hotels, restaurants, reviews, saved, admin | Not started | After 3 |
| 9 | Optimisation (measure, then tune) | Not started | Needs the above to measure |
| 10 | Final verification + docs + deployment | Not started | — |

**Recommended next implementation step:** Phase 4 on web. It is the brief's
defining feature, needs no credentials (OpenFreeMap is keyless), and can be
verified end-to-end in this environment with the headless Chromium harness built
during the Astryx review — including 60 FPS measurement, which Phase 9 demands
and which nothing has yet produced.

Three decisions gate the rest and only the owner can make them:

1. **R1 — mobile platform.** Keep the existing Expo React Native app (13k lines,
   working, shipping) and migrate its map surface to MapLibre, or build the
   Flutter app the brief names (nothing exists, no SDK here to verify it)? The
   brief itself says to preserve working features and to improve rather than
   replace sound architecture, which points at Expo.
2. **R3 — backend credentials.** Without a Supabase project URL + anon key,
   Phase 3 (auth) and every data-backed screen cannot be built or verified. No
   feature will be faked in their absence.
3. **§2.3 — one control scale.** Astryx neutral (Figtree, 32/36px controls) or
   the existing LeftBehind token scale (Inter/Fraunces, 44px controls)? One has
   to win for the product UI; today both render.

Nothing in this audit changed production data, reset a database, deleted a
tracked file, or installed a dependency.
