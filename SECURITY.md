# LeftBehind — Mobile Security

This document describes the security model of the LeftBehind app, how to build
and test it, and how to verify hardening after deployment.

## 1. Reality check / threat model

LeftBehind is an **offline-first React Native (Expo SDK 54) app**. There is
**no backend server**. All accounts, PINs, and travel documents live on the
device. The only network calls are anonymous, keyless, HTTPS requests to public
weather/geocoding APIs (Open-Meteo, BigDataCloud).

Because there is no server, the relevant threats are **local**:

| Threat | Mitigation |
| --- | --- |
| Device theft / backup extraction reading stored data | AES-256-GCM encryption at rest with a key in the Keychain/Keystore |
| Offline brute force of passwords/PINs | PBKDF2-HMAC-SHA256 key stretching + secure random salts |
| PIN guessing | Exponential lockout after 5 wrong attempts |
| Shoulder-surfing / screenshots of documents | Screen-capture protection on the vault |
| App tampering / running on rooted/jailbroken device | Root/jailbreak detection with a soft warning |
| Reverse-engineering a shipped backdoor | Dev console removed from production builds; passcode from build env |
| Sensitive data leaking into logs | Redacting logger; debug/info stripped in production |
| MITM on future backend traffic | HTTPS enforced + native certificate pinning (config ready) |

## 2. What was implemented

### Critical
- **Encryption at rest** (`src/utils/secureStore.ts`): sensitive Zustand stores
  (`auth`, `security`, `travel`) are AES-256-GCM encrypted before hitting
  AsyncStorage. The 256-bit master key is generated once and stored in
  `expo-secure-store` (iOS Keychain / Android Keystore),
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (never synced/backed up). Legacy plaintext
  installs are migrated transparently on first write.
- **Strong KDF** (`src/utils/crypto.ts`): passwords and PINs use
  PBKDF2-HMAC-SHA256 (100k iterations) + CSPRNG salts. Legacy SHA-256 records
  still verify and are silently upgraded on the next successful login/PIN entry.
- **Dev backdoor hardening** (`app/dev/knowledge.tsx`, `app/(tabs)/profile.tsx`):
  the hidden console only mounts in `__DEV__` builds, its passcode comes from
  `LB_DEV_PASSCODE` at build time (not hardcoded), and it locks after 5 tries.

### High
- **PIN lockout** (`src/store/securityStore.ts`): exponential backoff
  (30s → 15min cap) after 5 failed attempts, persisted so it survives restarts.
- **Screen-capture protection** (`src/components/VaultLockGate.tsx`): blocks
  screenshots / screen recording / app-switcher previews while the vault is open.
- **Password policy**: minimum 8 characters on register and reset.
- **Secure logging** (`src/utils/secureLog.ts`): redacts keys matching
  password/pin/token/secret/salt/hash/etc.; debug/info are no-ops in production.

### Medium / ready-for-backend
- **Root/jailbreak detection** (`src/utils/deviceIntegrity.ts`): via
  `jail-monkey` (dev/prod builds only). Detect-and-warn, never hard-block.
- **Hardened API client** (`src/api/client.ts`): HTTPS-only, Bearer token
  injection, optional HMAC request signing, timeouts, sanitized errors. Inert
  until `LB_API_BASE_URL` is set.
- **Certificate pinning config**: iOS `NSPinnedDomains` (`app.config.js`) and
  Android `network_security_config` `<pin-set>`
  (`plugins/withAndroidNetworkSecurity.js`). Activated by env vars at build time.

## 3. Dependencies to install

Run these (Metro/Expo server must be stopped first):

```bash
# Expo-managed native modules (correct SDK 54 versions auto-selected)
npx expo install expo-secure-store expo-screen-capture expo-dev-client

# Root/jailbreak detection (native; dev/prod builds only, not Expo Go)
npm install jail-monkey --legacy-peer-deps

# Pure-JS crypto (already in package.json; installed by npm install)
#   @noble/hashes  @noble/ciphers

# Align everything to SDK 54
npx expo install --fix
```

> `@noble/hashes` + `@noble/ciphers` and the crypto/storage/KDF/logging layers
> work in **Expo Go**. `expo-secure-store` and `expo-screen-capture` also work in
> Expo Go. `jail-monkey` and native **certificate pinning** require a **dev build**.

## 4. Moving off Expo Go → EAS development build

Cert pinning and root detection only run in a real build. To create one:

```bash
npm install -g eas-cli        # if not installed
eas login                     # your Expo account
eas init                      # links/creates the EAS project (writes projectId)

# Store the dev-console passcode as a secret (used only by dev builds)
eas secret:create --scope project --name LB_DEV_PASSCODE --value "choose-a-strong-passcode"

# Build the development client
eas build --profile development --platform android   # or ios
```

Install the resulting build on your device, then run `npx expo start --dev-client`
and scan the QR. This replaces Expo Go and enables the native security modules.

### When you add a backend later
Set these as EAS secrets and rebuild (see `app.config.js` / the Android plugin):

```bash
eas secret:create --scope project --name LB_API_BASE_URL     --value "https://api.yourbackend.com"
eas secret:create --scope project --name LB_PINNED_HOST      --value "api.yourbackend.com"
eas secret:create --scope project --name LB_CERT_PIN_PRIMARY --value "<base64 SHA-256 SPKI>"
eas secret:create --scope project --name LB_CERT_PIN_BACKUP  --value "<base64 SHA-256 backup>"
```

Compute a pin from the live cert:

```bash
openssl s_client -connect api.yourbackend.com:443 </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | openssl enc -base64
```

Always ship **two** pins (current + backup) so cert rotation doesn't brick the app.

## 5. Backend hardening (for when a server exists)

Not applicable today (no backend). When you build one, apply:
- Rate limiting per device/IP/user (e.g. token bucket; stricter on auth endpoints).
- Server-side auth: short-lived access tokens + rotating refresh tokens; validate
  the HMAC signature (`X-Signature`/`X-Timestamp`/`X-Nonce`) and reject stale
  timestamps / reused nonces (replay protection).
- Input validation & sanitization on every endpoint (never trust the client).
- Parameterized DB queries; least-privilege DB user; encryption at rest.
- Generic error responses (no stack traces / SQL / internal identifiers).
- Structured audit logging of auth + sensitive actions (no secrets in logs).

## 6. Testing checklist

Functional (must still pass — do not break UX):
- [ ] Existing account (created before this change) still logs in (legacy→PBKDF2 upgrade).
- [ ] New register enforces 8-char minimum; login/logout works.
- [ ] Password reset works and enforces policy.
- [ ] Vault: set PIN, lock, unlock with PIN, unlock with biometrics.
- [ ] Offline mode: app launches and all local features work with no network.
- [ ] Web build still loads (encryption degrades to plaintext on web by design).

Security:
- [ ] PIN lockout triggers after 5 wrong attempts; countdown shown; resets on success.
- [ ] Inspect AsyncStorage on a rooted device / emulator: `leftbehind-auth`,
      `leftbehind-security-v1`, `leftbehind-travel-v1` values start with `enc:v1:`
      and contain no readable email/hash/document data.
- [ ] Master key present in Keychain/Keystore, not in AsyncStorage.
- [ ] Screenshots blocked while the vault screen is open (Android shows black; iOS
      hides in app switcher).
- [ ] Production build: version-tap does nothing; `/dev/knowledge` shows
      "Not available"; no `lb-dev-feed` string in the binary (`strings`/`grep`).
- [ ] `console.log` output contains no passwords/PINs/tokens; none at all in release.
- [ ] Root/jailbreak: warning banner appears on a rooted/jailbroken test device.

Network (once a backend exists):
- [ ] App refuses `http://` requests.
- [ ] MITM proxy (Charles/mitmproxy) with a self-signed cert is **rejected**
      (pinning works); removing pins allows it (control test).

## 7. Deployment & post-deployment verification

Pre-release:
1. `npx expo install --fix` clean; `npx tsc --noEmit` passes.
2. `LB_DEV_PASSCODE` set as an EAS secret; no secrets committed to git.
3. `eas build --profile production` — confirm `EAS_BUILD_PROFILE=production` so the
   Android `network_security_config` + cleartext-disabled + pins are applied.

Post-release:
1. Decompile the release APK/IPA and grep for `lb-dev-feed`, API keys, secrets — none present.
2. Confirm `usesCleartextTraffic=false` and `networkSecurityConfig` in the merged
   `AndroidManifest.xml`; confirm `NSAppTransportSecurity`/`NSPinnedDomains` in `Info.plist`.
3. Verify on-device storage is encrypted (see checklist above).
4. Smoke-test upgrade path from the previous store version with a real prior install.

## 8. Known limitations
- No backend ⇒ no server-side validation, cross-device sync, or true account recovery.
- Password reset is unauthenticated (local only) by design until a backend exists.
- Biometric unlock is an OR alternative to the PIN (OS-guarded), not a second factor.
- Root/jailbreak detection is best-effort and can be bypassed by determined attackers.
