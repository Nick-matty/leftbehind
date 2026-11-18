# LeftBehind — Risks & Technical Limitations

Each risk lists impact, likelihood, mitigation, and — where relevant — the
decision only the product owner can make.

---

## R1 — Flutter cannot be built or verified in this environment (blocking decision)

**Impact:** high. **Likelihood:** certain.

There is no Flutter/Dart SDK, no Android SDK/Java, and no macOS/Xcode here. Dart
code written in this workspace **cannot be compiled, analyzed or run**, so a
"Flutter app" produced here would be unverified source, not working software.

**Options:**

| Option | Consequence |
| --- | --- |
| A. Flutter as specified + CI | Follow the brief exactly; add GitHub Actions (`subosito/flutter-action`) for `flutter analyze`/`test`/`build apk`, plus a macOS runner for iOS. Local iteration stays on web until CI is wired. |
| B. Keep React Native/Expo | Reuses the existing, working mobile codebase and lets the app be verified locally; contradicts the stated stack. |
| C. Flutter, unverified | Fastest to write, slowest to trust. Not recommended. |

**Recommendation:** A. It honours the brief and still yields verified builds, at
the cost of slower iteration and CI setup early (Phase 1–2).

---

## R2 — iOS builds need macOS

**Impact:** high. **Likelihood:** certain.

Linux runners cannot produce iOS binaries. TestFlight requires a macOS runner,
an Apple Developer account and signing credentials. Until then, iOS is
"source-complete, unbuilt" and must be reported as such.

**Mitigation:** GitHub Actions `macos-14` job, `--no-codesign` build for compile
validation, TestFlight only after Apple account access exists.

---

## R3 — No Supabase or Google Maps credentials in this environment

**Impact:** high. **Likelihood:** certain.

No `SUPABASE_URL`, anon key, service role, Google Maps keys, FCM/APNs credentials.
Live auth, storage and map rendering cannot be exercised here.

**Mitigation:** keep all keys in environment files/secrets, never in the repo
(`.env.example` documents names only). Implement against the documented contracts
and mark integrations "configured, not verified" until keys exist. The migration
files do not need credentials to be reviewed, only a local stack to be applied.

---

## R4 — Google Places data licensing and caching

**Impact:** high (legal/product). **Likelihood:** medium.

Google Maps Platform terms restrict storing and re-displaying Places content, and
require attribution. A catalogue that permanently copies names, hours, photos and
reviews from Places into `places`/`images` may violate those terms. Cached
`place_id` values are the durable identifier; other fields have stricter limits.

**Mitigation:**

1. Store `source_place_id` for every ingested row (already in the schema) and
   display required attribution.
2. Route all Places calls through the `places-proxy` Edge Function so caching,
   quotas and field masks are enforced centrally.
3. Prefer **first-party content**: staff-curated destinations, licensed or
   user-uploaded photography, and reviews written by our own users. Reviews from
   Google are **not** imported.
4. Have the product owner or counsel review the current terms before the ingest
   pipeline ships.

The schema deliberately keeps Google-sourced data separable
(`data_source`, `source_place_id`, `last_synced_at`) so a purge or refresh policy
is a single query away.

---

## R5 — Scope is a multi-month product, not a single delivery

**Impact:** high. **Likelihood:** certain.

The brief describes two clients, four web surfaces (public + admin), a database,
moderation, push and deployment. A realistic estimate for one senior engineer is
**3–5 months** to the definition of done, with iOS signing and store review on top.

**Mitigation:** the phased roadmap delivers a usable slice at each gate (Phase 1–4
alone yields a working discovery web app). Do not compress phases; a "complete"
build attempted in one pass would be broadly broken rather than narrowly working.

---

## R6 — SQL is syntax-checked but not executed here

**Impact:** medium. **Likelihood:** high.

`pglast` proves the migrations parse; it cannot prove that policies behave,
that `on conflict` inference matches the partial index, or that PostGIS generated
columns work on the target version. Semantic bugs are likely on first apply.

**Mitigation:** Phase 1 gate requires `supabase db reset` on a local stack and a
scripted policy suite (anonymous vs. member vs. staff vs. moderator) before any UI
work. Treat the schema as "reviewed, not proven" until then.

---

## R7 — Review authenticity and moderation load

**Impact:** medium. **Likelihood:** high.

Open review systems attract spam and retaliation. The schema blocks duplicate
reviews, caps 20 per day, supports reports and moderation-with-audit, but
moderation is a human cost.

**Mitigation:** moderators queue + reports (implemented), email verification
required before reviewing (Supabase setting), rate limits per IP at the edge,
and no review editing after moderation action without re-review.

---

## R8 — Push notifications (FCM/APNs) complexity

**Impact:** medium. **Likelihood:** medium.

`device_tokens`, service credentials, permission flows, iOS APNs keys, and
background delivery are a distinct subsystem; partially done pushes erode trust.

**Mitigation:** scheduled last in Phase 6; in-app feed ships first and works
without push; `send-push` is the only component holding provider credentials.

---

## R9 — Legacy app coexistence

**Impact:** medium. **Likelihood:** certain during the rebuild.

Two mobile codebases in one repo invite drift and confusion (two `package.json`
roots, two design languages, two auth models). The legacy tree also contains
committed build/debug artefacts.

**Mitigation:** freeze the legacy app (no feature work), document its status in
the README, delete it only with explicit approval at Phase 9, and keep new code in
`apps/` so boundaries are obvious.

---

## R10 — Existing users cannot be migrated

**Impact:** medium. **Likelihood:** certain.

Legacy accounts exist only as local PBKDF2 hashes on devices; there is no server
record and no verifiable email. They cannot become Supabase accounts.

**Mitigation:** state it plainly in release notes; offer an in-app export of
legacy data (JSON) and a "create your account" path. Never silently drop user data.

---

## R11 — Admin authorization mistakes

**Impact:** high. **Likelihood:** medium.

Admin panels historically leak through client-side guards, service-role keys in
bundles, or over-broad policies.

**Mitigation:** role checks in the database (implemented), admin RPCs re-verify
roles, no service-role key in any client, separate deploy origin, audit logging,
and a test that calls privileged endpoints with a normal user JWT and expects
`42501`.

---

## R12 — Google Maps API cost

**Impact:** medium. **Likelihood:** medium.

Places details/autocomplete are billed per request; a map that queries per pan can
generate surprising invoices.

**Mitigation:** server-side proxy with per-user quotas, debounce + minimum
viewport delta, `sessionToken` batching for autocomplete→details, budget alerts in
Google Cloud, and cached reference data where terms allow.

---

## R13 — Location privacy and regulatory exposure

**Impact:** high (legal). **Likelihood:** medium.

Precise location and user-generated content are personal data (GDPR/CCPA).
`recent_views` and geolocation are sensitive by nature.

**Mitigation:** ask for location only when the map needs it, never store raw
device coordinates except as a user-chosen "near me" query (not persisted
server-side), provide account deletion (`delete-account`) and data export, publish
a privacy policy, and keep `recent_views` user-scoped with `ON DELETE CASCADE`.

---

## R14 — Image rights

**Impact:** medium. **Likelihood:** medium.

Scraped destination photography is a copyright risk.

**Mitigation:** only licensed, CC0, or user-uploaded imagery; store `credit` on
every `images` row; no placeholder stock that misrepresents a place.

---

## R15 — Type drift between TS and Dart

**Impact:** medium. **Likelihood:** high over time.

TypeScript types are generated from Postgres; Dart models are hand-written.

**Mitigation:** CI check that regenerated TS types match the committed file;
`docs/api.md` is the shared contract; Phase 8 includes a model review; a
future option is generating Dart models from an OpenAPI/JSON schema export.

---

## Summary table

| ID | Risk | Impact | Likelihood | Owner decision needed |
| --- | --- | --- | --- | --- |
| R1 | Flutter unverifiable here | High | Certain | **Yes** — option A/B/C |
| R2 | iOS needs macOS | High | Certain | No |
| R3 | Missing credentials | High | Certain | Yes — provision projects/keys |
| R4 | Places licensing | High | Medium | Yes — legal review |
| R5 | Scope size | High | Certain | Yes — prioritisation |
| R6 | SQL not executed | Medium | High | No |
| R7 | Review abuse | Medium | High | No |
| R8 | Push complexity | Medium | Medium | No |
| R9 | Legacy coexistence | Medium | Certain | Yes — deletion approval |
| R10 | No account migration | Medium | Certain | No |
| R11 | Admin authz | High | Medium | No |
| R12 | Maps cost | Medium | Medium | No |
| R13 | Location privacy | High | Medium | Yes — policy sign-off |
| R14 | Image rights | Medium | Medium | Yes — asset sourcing |
| R15 | Type drift | Medium | High | No |
