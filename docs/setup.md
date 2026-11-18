# LeftBehind — Local Setup

Two things are true at once: the backend schema **applies and passes its policy
tests against a real PostgreSQL 16 + PostGIS cluster**, and **only the web design
system and public shell exist** (`apps/admin` and `apps/mobile` are later work).
This guide covers what you can actually run today, then the full target setup.

---

## 1. Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | ≥ 20 (workspace currently uses 26) | web, admin, edge functions |
| npm | ≥ 10 | dependency install |
| Supabase CLI | ≥ 1.200 | local stack, migrations, type generation |
| Docker (or Podman) | recent | local Supabase stack only |
| Flutter SDK | ≥ 3.24 (stable) | mobile app (Phase 2+) |
| Android Studio + SDK 34+ | — | Android builds |
| Xcode 15+ (macOS only) | — | iOS builds |
| Python 3 | ≥ 3.10 | `scripts/check_sql.py` syntax gate |

> The current cloud workspace has **no** Docker daemon, Supabase CLI or Flutter
> SDK. PostgreSQL + PostGIS are therefore provided by the rootless harness in
> §4, which is enough to apply every migration and run the policy suite. No Dart
> code exists yet (see `docs/risks.md` R1).

---

## 2. Repository layout (current)

```text
backend/supabase/migrations/     # applied by Supabase CLI
backend/supabase/seed/           # reference taxonomy only
backend/supabase/config.toml     # local stack config
packages/design-tokens/          # tokens.json + generated CSS variables and Tailwind preset
apps/web/                        # Vite + React public app (design system + shell)
docs/                            # this documentation set
scripts/check_sql.py             # SQL parse gate
app/  src/  server/              # LEGACY Expo app (frozen, not part of the rebuild)
```

---

## 3. Parse gate (fast, no database)

```bash
python3 -m venv .venv-sqlcheck
.venv-sqlcheck/bin/pip install pglast
.venv-sqlcheck/bin/python scripts/check_sql.py
```

Expected: every file `ok` and exit code 0. This parses with libpg_query — the
grammar PostgreSQL itself uses — so it catches syntax errors but not semantic
ones.

---

## 4. Apply the backend locally

### 4.0 Option A — rootless PostgreSQL harness (no Docker; verified here)

This is the path used in this repository. It downloads PostgreSQL 16 and
PostGIS 3.4 from Ubuntu packages, extracts them into `.pgstack/` (gitignored)
and runs a cluster as the current user on port 55432. Nothing is installed
system-wide and no root is needed.

```bash
scripts/install_local_postgres.sh   # once: ~600 MB into .pgstack/
scripts/local_db.sh test            # reset + migrations + 106 assertions
scripts/local_db.sh demo            # reset + clearly-fictional demo rows
scripts/local_db.sh psql            # interactive session
```

`scripts/local_db.sh test` recreates the database from scratch, applies the
migrations in order, loads `backend/supabase/seed/0001_reference.sql`, then
`backend/supabase/tests/00_shims.sql`, `05_fixtures.sql`, `10_rls.sql` and
`20_functions.sql`. It prints one line per assertion and exits non-zero if any
fail.

> The shims file emulates the `auth` and `storage` schemas and the
> `anon`/`authenticated` roles that a Supabase project provides. **Never apply
> `tests/00_shims.sql` to a real project** — it defines a permissive
> `auth.uid()`.

### 4.1 Option B — Supabase CLI (Docker available)

Preferred wherever Docker works: it exercises the real Auth, Storage and
REST layers on top of the same SQL.

```bash
# from the repository root
npx supabase start          # boots Postgres, Auth, Storage, Studio in Docker

# first run only: point the CLI at backend/supabase
npx supabase link --project-ref local   # accepts defaults for a local stack

npx supabase db reset       # applies migrations/ then seed/
```

If the CLI expects the `supabase/` directory at the repo root, run it from
`backend/` instead:

```bash
cd backend/supabase && npx supabase start && npx supabase db reset
```

Then confirm the seed took:

```sql
select count(*) from public.destination_categories;  -- 8
select count(*) from public.amenities;               -- 15
```

### 4.2 Policy verification

The scripted suite is the source of truth — do not hand-run ad-hoc queries and
call the backend verified. Against a Supabase CLI stack, run the same files:

```bash
psql "$SUPABASE_DB_URL" -f backend/supabase/tests/00_shims.sql
psql "$SUPABASE_DB_URL" -f backend/supabase/tests/05_fixtures.sql
psql "$SUPABASE_DB_URL" -f backend/supabase/tests/10_rls.sql
psql "$SUPABASE_DB_URL" -f backend/supabase/tests/20_functions.sql
psql "$SUPABASE_DB_URL" -c "select name, ok, detail from tests.results where not ok"
```

On a real project the shim file is unnecessary (Auth and Storage already exist)
but harmless only if you skip it — apply `05_fixtures.sql` onwards, and drop the
`tests` schema afterwards.

What the 106 assertions cover: anonymous visibility, cross-user isolation,
role boundaries (member / content manager / moderator / super admin), review
rate limiting and duplicate prevention, moderation with audit trail, rating
recalculation, search and proximity RPCs, and the demo-seed guard.

### 4.2 Generate shared types (after credentials exist)

```bash
npx supabase gen types typescript --project-id <ref> > packages/shared/src/db.ts
```

---

## 5. Environment variables

Copy `.env.example` to `.env` (never commit it) and fill in:

| Variable | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | web, admin, mobile | public |
| `SUPABASE_ANON_KEY` | web, admin, mobile | public, but still not committed in this repo's policy |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | **never** in a client build |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | web/admin build | Vite exposes `VITE_*`; only public values allowed |
| `GOOGLE_MAPS_API_KEY` | mobile SDK (restricted) | Android/iOS app restrictions |
| `GOOGLE_MAPS_JS_API_KEY` | web Maps JS (referrer-restricted) | browser key |
| `GOOGLE_PLACES_SERVER_KEY` | `places-proxy` function secret | server-only |
| `FCM_*`, `APNS_*` | `send-push` function secrets | server-only |

Flutter reads configuration via `--dart-define` (no `.env` file in the bundle):

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon> \
  --dart-define=GOOGLE_MAPS_API_KEY=<android key>
```

---

## 6. Google Maps Platform configuration

1. Create a Google Cloud project and enable **Maps SDK for Android**, **Maps SDK
   for iOS**, **Maps JavaScript API**, **Places API**, **Geocoding API**.
2. Create **separate keys per platform** and restrict each:
   - Android: package name `com.leftbehind.app` + release SHA-1.
   - iOS: bundle id `com.leftbehind.app`.
   - Web: HTTP referrer allowlist (localhost + production domains).
   - Server (Places proxy): no referrer/IP restriction needed, but store it only
     as a function secret and set a daily quota.
3. Set billing alerts and per-API quotas **before** building the map screen.
4. Add the Android/iOS keys to the Flutter app config (not to `app.json` of the
   legacy app).

Place search must degrade gracefully while keys are absent: show a
"map configuration missing" state rather than an empty map.

---

## 7. Bootstrapping the first administrator

The first super admin cannot be created through the UI (there is no UI, and
self-promotion is blocked by design). After registering a user normally:

```sql
-- run with the service role, never from a client
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'super_admin')
on conflict do nothing;
```

Subsequent role changes go through `admin_set_role()` in the dashboard, which
writes to `activity_logs`.

---

## 8. Running the legacy app (for reference only)

```bash
npm install
npx expo start        # a / i / w
```

It is frozen and unrelated to the rebuild; its `server/` is not started by
anything in the new architecture.

---

## 9. When the web app exists (Phase 2+)

```bash
cd apps/web
npm install                 # the app has its own lockfile (see progress D13)
npm run dev                 # http://localhost:5173, regenerates tokens first
npm run typecheck           # tsc --noEmit
npm run build               # typecheck + production build into apps/web/dist
```

`/design` is the component inventory: type scale, semantic palette, every
primitive, an admin table. Use it to check a token change without hunting for a
screen that uses it.

To regenerate the token layer on its own:

```bash
node packages/design-tokens/build.mjs   # writes packages/design-tokens/dist/
```

Never edit `dist/tokens.css` or the preset by hand: change `tokens.json` and
rebuild. The web apps read `VITE_*` variables and must fail loudly (not silently
half-work) when they are missing.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `supabase start` fails with "Cannot connect to the Docker daemon" | Docker is not running or the socket is not accessible to your user |
| `db reset` fails at `create extension postgis` | Not enough privileges / image without PostGIS; local Supabase includes it. On the rootless harness this is handled by the control-file alias in `install_local_postgres.sh` |
| `psql: error while loading shared libraries: libpq.so.5` | Run `psql` through `scripts/local_db.sh`, which sets the extracted `LD_LIBRARY_PATH` |
| Harness suite fails with `permission denied for schema extensions` | The grants in `20261117090100_rls.sql` were removed; anonymous map queries need `USAGE` on that schema |
| Policies return nothing for a valid user | Missing `Authorization` header, or JWT claims not set in raw SQL (`set request.jwt.claims`) |
| `42501` from `dashboard_stats()` | The user lacks an admin role; grant it with the SQL in §7 |
| `pglast` install fails | Python < 3.9, or building from source without a wheel; use Python 3.11+ |
| Map is blank on web | Web key missing referrer entry for the dev origin |
