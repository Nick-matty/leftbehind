# LeftBehind — Deployment

Status: **target plan, not executed.** No production project, DNS, store listing
or signing credential exists yet, and this workspace has no cloud credentials.
Nothing in this document has been run against a live environment.

---

## 1. Environments

| Environment | Supabase | Web | Admin | Mobile |
| --- | --- | --- | --- | --- |
| Local | `supabase start` (Docker) | `vite dev` :5173 | `vite dev` :5174 | emulator / simulator |
| Preview | hosted branch or second project | preview deploy per PR | preview deploy per PR | internal track build |
| Production | dedicated project | `app.leftbehind.*` | `admin.leftbehind.*` | Play / TestFlight |

Rules:

- Preview and production **never** share a database. Dummy content in production
  is how "fake but looks real" data reaches users.
- Admin is deployed to its own hostname; it is not a route inside the public app.
- Secrets live in the platform's secret store (Supabase function secrets, CI
  secrets, host env vars). No `.env` file is ever committed.

---

## 2. Database

```bash
npx supabase link --project-ref <production-ref>
npx supabase db push            # applies migrations/ in order
npx supabase db lint            # optional: schema lint
```

CI job (runs on PRs touching `backend/`):

1. `python scripts/check_sql.py`
2. `supabase db reset` against the ephemeral stack
3. policy test suite (Phase 1 deliverable)
4. `supabase db diff --linked` must be empty (no drift between migrations and the
   linked project)

Operational requirements:

- **Backups**: confirm daily backups and PITR on the production plan; record the
  restore procedure and test it once.
- **Migrations are forward-only.** A rollback is a new migration, not a
  `db reset`.
- **Destructive changes** (dropping a column/table) require a two-step deploy:
  stop writing → deploy → remove in a later migration.
- **Seed data**: reference taxonomy only. Business data is ingested/curated.

---

## 3. Edge Functions

```bash
npx supabase functions deploy places-proxy
npx supabase functions deploy ingest-places
npx supabase functions deploy send-push
npx supabase functions deploy delete-account

npx supabase secrets set GOOGLE_PLACES_SERVER_KEY=... FCM_PROJECT_ID=... APNS_KEY=...
```

Checks after deploy:

- Unauthenticated call → `401`.
- Authenticated non-staff call to `ingest-places` → `403`.
- No secret appears in logs; function logs show request ids, not tokens.

---

## 4. Web and admin

Both are static Vite builds, deployable to Vercel, Netlify or Cloudflare Pages.
Required environment (per environment):

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_MAPS_JS_API_KEY   (web only)
```

Build:

```bash
npm ci
npm run build --workspace apps/web
npm run build --workspace apps/admin
```

Host requirements:

- SPA fallback rewrite to `index.html` (React Router).
- Long-cache hashed assets, `no-cache` for `index.html`.
- Security headers: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: geolocation=(self)`.
- CSP allowing Supabase, Google Maps and the media bucket; no `unsafe-eval` in
  production.

Post-deploy smoke test (manual, per release):

1. Load home anonymously → published content renders, drafts absent.
2. Sign in → saved places from another device appear.
3. Open a place → map loads, directions link opens Google Maps.
4. Save/unsave and review create/edit/delete round-trip.
5. Admin: moderation action on a test review, audit row appears.
6. Sign out → no user data or cached queries remain visible.

---

## 5. Android

```bash
flutter build appbundle --release \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=... \
  --dart-define=GOOGLE_MAPS_API_KEY=...
```

- Keystore created once, stored in CI secrets (never committed).
- Play Console: internal testing → closed → production; data safety form must
  declare location and personal data; privacy policy URL required.
- Release SHA-1 added to the Android Maps key restriction.
- Minimum SDK 23+, target the current Play requirement.

---

## 6. iOS

Needs macOS (see `docs/risks.md` R2).

```bash
flutter build ipa --release \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=... \
  --dart-define=GOOGLE_MAPS_API_KEY=...
```

- App Store Connect app record, distribution certificate, provisioning profile
  in CI secrets.
- `NSLocationWhenInUseUsageDescription` must match the copy in the app.
- TestFlight → App Review → release; include the account-migration note.

---

## 7. Monitoring & operations

| Signal | Where | Alert threshold |
| --- | --- | --- |
| API error rate | Supabase logs / host logs | > 2 % over 5 min |
| Edge Function failures | Supabase function logs | any 5xx burst |
| DB connections / size | Supabase dashboard | > 70 % of plan |
| Slow queries | `pg_stat_statements` | p95 > 300 ms |
| Places API spend | Google Cloud billing | daily budget alert |
| Auth failures spike | Supabase auth logs | credential-stuffing signal |
| Push delivery failures | provider console | > 5 % |

Runbook basics: rotate a leaked anon key (safe to rotate, it is public by
design), rotate the service role (function redeploy), disable a compromised
account (Auth admin + revoke refresh tokens), unpublish a bad image (storage
delete + `images` row removal).

---

## 8. Release checklist

- [ ] Migrations applied and drift-free; policy tests green
- [ ] `packages/shared/src/db.ts` regenerated and committed
- [ ] Web + admin builds pass, typecheck and tests green
- [ ] Mobile `flutter analyze` + tests green in CI; release build signed
- [ ] Secrets present for the target environment only
- [ ] Google key restrictions verified (SHA-1, bundle id, referrers)
- [ ] Backup restore tested in the last 30 days
- [ ] Privacy policy and terms published; store data-safety forms submitted
- [ ] Post-deploy smoke test (§4) completed and recorded
- [ ] Rollback path written for this release (previous build/deploy id)
