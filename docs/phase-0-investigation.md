# LeftBehind — Phase 0 Project Investigation Report

Date: 2026-11-17
Repository: `Nick-matty/leftbehind` @ `ac08c6d` ("Initial commit"), branch `master`
Investigated by: Buffy (cloud workspace `/workspace/chats/41449ba595c5ea0b636920b3`)

---

## 1. Executive summary

The repository is **not** an early version of the platform described in the rebuild
brief. It is a **finished, offline-first travel *packing companion*** built with
**Expo SDK 54 / React Native 0.81 / React 19**, plus an optional
**zero-knowledge Express + Prisma sync server**. There is no Flutter code, no
Supabase code, no web React app and no admin dashboard anywhere in the tree.

That means the rebuild is a **greenfield product build with a partial asset
donation**, not a refactor. Three consequences drive the whole plan:

| Finding | Consequence |
| --- | --- |
| Product concept differs (packing checklists, budget calendar, document vault vs. destination discovery, maps, hotels, reviews) | Domain layer, stores and screens cannot be carried over. Only utilities and configuration survive. |
| The requested stack (Flutter + Supabase) shares nothing with the existing stack (Expo + Express/Prisma) | This is a stack replacement. Nothing can be "upgraded in place". |
| The existing UI direction is liquid glass, which the brief explicitly forbids | The visual layer must be replaced, not restyled. |

The good news: the existing app is unusually disciplined about security and
configuration (encrypted local storage, KDF, certificate-pinning plumbing,
threat-model documentation), and those artefacts transfer almost 1:1 to the new
mobile app. Its 13k lines of screen code do not.

---

## 2. What actually exists

Counts measured on the checked-out commit:

| Metric | Value |
| --- | --- |
| Tracked files | 149 |
| TypeScript / TSX lines | 13,173 |
| Expo Router screens | 35 |
| Express server source lines | 889 |
| Automated tests | **0** (no `*.test.*`, `*.spec.*`, `__tests__`, Jest/Vitest config) |
| Committed `.env` files | 0 (only `server/.env.example`) — good |
| Committed build output | 4 files under `dist-sdk54-check/` — should not be in Git |
| Committed debug artefacts | 8 (`_cdp_*`, `_chrome_*`, `_term_snip.txt`, `_web_dom.html`, …) |
| Runtime dependencies (mobile) | 40 |
| Languages file | `src/i18n/translations.ts`, 424 lines |

### 2.1 Mobile application (`app/`, `src/`)

- **Navigation**: Expo Router, tabs `home`, `trips`, `map`, `calendar`, `profile`,
  plus `auth/`, `session/`, `tools/` (18 tool screens) and a dev-only console.
- **State**: Zustand stores (`appStore`, `authStore`, `settingsStore`,
  `travelStore`, `securityStore`, `assistantStore`).
- **Auth**: device-local only. Registration stores a PBKDF2-HMAC-SHA256 hash
  (100k iterations, CSPRNG salt) in encrypted AsyncStorage. Accounts never leave
  the device.
- **Security**: AES-256-GCM encryption of the sensitive stores with a key held in
  `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), PIN lockout with
  exponential backoff, screen-capture protection on the vault, jailbreak/root
  detection via `jail-monkey`, redacting logger, optional HMAC request signing in
  `src/api/client.ts`.
- **Maps**: `react-native-maps` on native; `app/(tabs)/map.web.tsx` is a stub
  because the library has no browser implementation. Place search is gated behind
  `PLACES_API_CONFIGURED`.
- **Offline**: NetInfo-driven messaging, AsyncStorage persistence for packing,
  trips, budget and settings.
- **Design**: custom "liquid glass" system in `src/utils/theme.ts`
  (`Glass.light/dark`, blur intensities, tinted translucent surfaces, gradient
  quick-action tiles).

### 2.2 Server (`server/`)

Express 4 + Prisma, described in its own README as a **zero-knowledge E2EE
backend**:

- Tables: `users` (scrypt hash of a *client-derived* auth key), `refresh_tokens`
  (SHA-256 token hash, rotation chain, reuse detection), `vault_blobs` and
  `vault_files` (opaque AES-256-GCM ciphertext).
- Hardening: helmet, hpp, CORS allowlist, rate limiting, Zod validation, pino
  logging with redaction, 25 MB body cap.
- Default datasource is **SQLite** (`file:./dev.db`); Postgres is mentioned as a
  comment, not configured.

This server exists to sync an encrypted personal vault. A discovery platform needs
a **shared catalogue** (destinations, places, reviews, moderation) with real
server-side authorization. Almost none of this server's design applies.

### 2.3 Documentation

- `README.md` — accurate about the packing product.
- `SECURITY.md` — genuinely good threat model, but its premise ("there is no
  backend server") is already contradicted by `server/`; the rebuild must not
  inherit that contradiction.
- No architecture, database, API or deployment documentation exists.

---

## 3. Reuse assessment

### 3.1 Worth preserving (carry into the new codebase)

| Asset | Path | Why |
| --- | --- | --- |
| Security utilities | `src/utils/crypto.ts`, `secureStore.ts`, `secureLog.ts`, `deviceIntegrity.ts` | Correct KDF choice, non-synced keychain usage, redacting logger. Port to Dart on mobile and keep for React on web where applicable. |
| Certificate-pinning plumbing | `app.config.js`, `plugins/withAndroidNetworkSecurity.js` | Pinning for `*.supabase.co` is a real requirement; the patterns are ready. |
| Google Maps configuration shape | `app.json` (`ios.config.googleMapsApiKey`, `android.config.googleMaps.apiKey`, location permission copy) | Exact key names and permission strings needed; values must be supplied. |
| Location permission copy | `app.json` `infoPlist` / plugin descriptions | Well-written user-facing permission rationale, reusable. |
| i18n scaffolding | `src/i18n/useT.ts`, `translations.ts` | Useful structure for the discovery UI; strings themselves are packing-specific. |
| Notification helper shape | `src/hooks/useNotifications.ts` (+ `.web.ts`) | Channel/permission handling pattern to mirror in Flutter. |
| Live data integrations | `src/features/liveWeather.ts`, `liveRates.ts` | Keyless HTTPS APIs (Open-Meteo, BigDataCloud) usable for destination weather. |

### 3.2 Cannot be reused

| Asset | Reason |
| --- | --- |
| All 35 screens and the tool suite | Different product surface; banned visual language. |
| Zustand travel/packing/assistant stores | Wrong domain model and storage shape. |
| Local auth | Device-scoped by design. Passwords are only ever stored as a local hash, so **existing accounts cannot be migrated**: users must register again. This must be stated in release notes. |
| `server/` (Express + Prisma) | Supabase + RLS replaces it. Keeping both would duplicate authorization logic, which the brief forbids. |
| `src/components/Glass.tsx`, `AppBackground.tsx`, glass theme | Explicitly prohibited (glassmorphism / excessive transparency). |
| `dist-sdk54-check/`, `_cdp_*`, `_chrome_*`, `_term_snip.txt` | Build/debug residue committed by accident. |

### 3.3 Legacy disposition

The existing app is **left in place** at the repo root until the new apps reach
feature parity, so nothing is lost and the change is reviewable. New work goes
into `apps/mobile`, `apps/web`, `apps/admin` and `backend/supabase`. Deleting the
legacy tree is a separate, explicitly authorized step (see `docs/roadmap.md`,
Phase 9). No files were deleted during this phase.

---

## 4. Problems in the existing implementation

1. **Zero automated tests** for 13k lines, including crypto and auth. Unacceptable
   for the rebuild; the new plan makes tests a phase exit criterion.
2. **Committed build output and debug scratch files** (12 files). Pollutes review
   and history.
3. **Documentation drift**: `README.md` and `SECURITY.md` describe "no backend",
   while a backend is present. Release documentation must be generated from the
   actual architecture.
4. **Device-scoped accounts** presented alongside a sync server, so users
   reasonably expect cross-device accounts and do not get them.
5. **Web map is a stub.** The brief requires a real, responsive map on web.
6. **Placeholder API keys** (`YOUR_IOS_GOOGLE_MAPS_API_KEY`) ship in `app.json`
   with no documented failure mode beyond a disabled search flag.
7. **Design language conflicts with the brief** (glassmorphism, gradients).
8. **`react-native-maps` version 1.20.1 with RN 0.81** — the map module is pinned
   tightly and is a known source of upgrade breakage; it is dropped anyway.

---

## 5. Product gap analysis (brief vs. existing)

| Brief module | Exists today | Gap |
| --- | --- | --- |
| Authentication | Local-only email/password | Needs Supabase Auth, email verification, recovery, sessions |
| Home / discovery | Packing home | New: featured, popular, trending, nearby, recently viewed |
| Explore + categories | None | New |
| Interactive map | Native-only map, no place data | New, including web |
| Hotels / restaurants / attractions | None (packing venue templates only) | New: catalogue, detail pages, amenities, booking links |
| Saved places / collections | "Wishlist" tool in device storage | New: server-persisted, cross-device, collections |
| Reviews & ratings | None | New, with moderation and abuse limits |
| Profile | Local profile + settings | New: server profile, preferences, privacy |
| Notifications | Local checkout reminders | New: push architecture + in-app feed |
| Admin dashboard | None | New |
| Web app | Expo web build of a mobile UI | New React app |

Nothing in the existing app covers reviews, moderation, catalogue data, admin,
cross-device accounts or a web product. This confirms the greenfield conclusion.

---

## 6. Environment constraints (important for planning)

Verified in this workspace:

| Tool | Status |
| --- | --- |
| Node.js v26.13.0, npm 11.20.0 | available |
| Bun 1.x | available |
| Python 3 | available |
| PostgreSQL client (`psql`) | **missing** |
| Docker daemon | **unavailable** (socket permission denied) |
| Supabase CLI | **missing** |
| Flutter / Dart SDK | **missing** |
| Android SDK / Java / Gradle | **missing** |
| Xcode / macOS | **not available (Linux)** |

Implications:

- **Dart/Flutter code cannot be compiled, analyzed or run here**, and iOS builds
  are impossible on Linux regardless. Flutter work needs CI (GitHub Actions with
  `subosito/flutter-action`, or a macOS runner for iOS) before it can be called
  verified.
- **SQL cannot be executed** against a live Postgres instance here. Mitigation
  used: `pglast` (libpg_query, the parser PostgreSQL itself uses) validates every
  migration's syntax; `scripts/check_sql.py` makes that repeatable. Semantic
  verification requires applying the migrations to a real project or a local
  Supabase stack.
- Web apps (Vite/React) **can** be installed, built, typechecked, tested and
  previewed here — that is where local verification effort pays off.

---

## 7. Verified baseline

Commands run against the pre-existing tree (no modifications made to it):

```text
git ls-files | wc -l                      -> 149
git ls-files '*.ts' '*.tsx' | xargs wc -l -> 13,173
git ls-files | grep -c test/spec          -> 0
git log --oneline -10                     -> ac08c6d Initial commit
```

New work added in this phase (all under `backend/`, `scripts/`, `docs/`):

```text
.venv-sqlcheck/bin/python scripts/check_sql.py
ok   backend/supabase/migrations/20261117090000_init.sql
ok   backend/supabase/migrations/20261117090100_rls.sql
ok   backend/supabase/migrations/20261117090200_functions.sql
ok   backend/supabase/seed/0001_reference.sql
6/6 SQL files parsed
```

---

## 8. Recommendation

1. **Treat this as a new product** in the existing repository, not a refactor.
2. **Adopt Supabase as the single source of truth** for auth, data, storage and
   authorization; delete no legacy code until parity.
3. **Reuse the security, maps-configuration and i18n assets listed in §3.1**, and
   nothing else.
4. **Do not port the glass design.** The design system in
   `docs/design-system.md` replaces it entirely.
5. **Do not ship Flutter work as "done" from this environment.** Either gate it
   behind CI or keep the mobile app on the current React Native platform as an
   explicit, recorded deviation. This is the one decision that needs the product
   owner before Phase 2 of the mobile work (see `docs/risks.md`, R1).
