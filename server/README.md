# LeftBehind Server

Zero-knowledge, end-to-end-encrypted backend for the LeftBehind travel app.

- **Stack:** Node.js + Express + TypeScript + Prisma + SQLite
- **Auth:** password-derived auth key (password never sent) → scrypt-hashed
  server-side; JWT access tokens + rotating refresh tokens with reuse detection
- **Privacy:** user content is encrypted **on the device** before upload. The
  server stores only ciphertext it **cannot decrypt** (`VaultBlob`). Even a full
  database breach or a malicious operator cannot read your documents/trips.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness check |
| POST | `/api/auth/register` | – | Create account (`email`, `fullName`, `authKey`) |
| POST | `/api/auth/login` | – | Sign in (`email`, `authKey`) |
| POST | `/api/auth/refresh` | – | Rotate tokens (`refreshToken`) |
| POST | `/api/auth/logout` | – | Revoke a refresh token |
| GET | `/api/auth/me` | ✔ | Current profile |
| PATCH | `/api/auth/me` | ✔ | Update `fullName` |
| POST | `/api/auth/change-credentials` | ✔ | Change password credential |
| DELETE | `/api/auth/me` | ✔ | Delete account + all data |
| GET | `/api/sync` | ✔ | Pull all encrypted blobs |
| GET | `/api/sync/revisions` | ✔ | Pull revision map |
| PUT | `/api/sync/:storeKey` | ✔ | Upsert an encrypted blob |
| DELETE | `/api/sync/:storeKey` | ✔ | Delete a store's blob |
| GET | `/api/files` | ✔ | List encrypted file metadata |
| GET | `/api/files/:fileId` | ✔ | Download an encrypted file (e.g. doc image) |
| PUT | `/api/files/:fileId` | ✔ | Upload an encrypted file |
| DELETE | `/api/files/:fileId` | ✔ | Delete an encrypted file |

`storeKey` ∈ `travel | app | assistant | settings`. `fileId` e.g. `doc-<uuid>`.
Files (document photos) are AES-256-GCM encrypted on-device before upload — the
server stores only ciphertext.

## Security features

- `helmet` security headers, strict `cors` allow-list (native apps send no Origin)
- Rate limiting: global, strict on `/api/auth`, bounded on `/api/sync`
- `zod` validation on every input; unknown fields stripped
- Per-user data isolation (all queries scoped to the JWT subject)
- scrypt (memory-hard) credential hashing; constant-time comparison
- Refresh-token rotation + reuse detection (revokes the token family on theft)
- Redacting logger (no secrets/ciphertext in logs); generic error responses
- Graceful shutdown; fail-fast env validation; refuses weak secrets in production

## Run it (local dev)

```bash
cd server
cp .env.example .env

# generate a strong access-token secret and paste it into .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm install
npm run prisma:migrate      # creates SQLite db + tables
npm run dev                 # starts on http://localhost:4000
```

Verify: open `http://localhost:4000/health` → `{ "status": "ok", ... }`.

## Point the mobile app at it

The phone can't reach `localhost` (that's the phone itself). Use your computer's
LAN IP:

1. Find your IP: `ipconfig` (Windows) / `ifconfig` (macOS/Linux) → e.g. `192.168.1.42`.
2. Edit `src/config/backend.ts` in the app:
   ```ts
   export const DEV_API_BASE_URL = 'http://192.168.1.42:4000';
   ```
3. Make sure `.env` `CORS_ORIGINS` isn't blocking you (native apps are fine; the
   web build needs its origin listed).
4. Restart Expo. Register/login now creates a real cloud account and your data
   syncs (encrypted) across devices.

Leave `DEV_API_BASE_URL` empty to keep the app fully offline/local.

## Production notes

- Set `NODE_ENV=production`, a strong `ACCESS_TOKEN_SECRET`, and an `https://`
  `LB_API_BASE_URL` in the app build (the app refuses non-HTTPS in production).
- Switch to PostgreSQL by setting `DATABASE_URL` and changing the `provider` in
  `prisma/schema.prisma` to `postgresql`, then `npm run prisma:deploy`.
- Run behind a TLS-terminating reverse proxy; `trust proxy` is already enabled.
- Back up the database; note that lost user passwords mean **permanently**
  unreadable data (zero-knowledge trade-off).

## Zero-knowledge model (how privacy is guaranteed)

On the device (see `src/features/cloud/e2ee.ts`):

```
masterKey = PBKDF2(password, "leftbehind:kdf:v1:<email>", 100k)
authKey   = PBKDF2(masterKey, "auth:<password>")     # sent to server
encKey    = PBKDF2(masterKey, "enc:leftbehind:v1")   # NEVER sent
```

The server stores `scrypt(authKey)` and AES-256-GCM ciphertext encrypted with
`encKey`. It never receives the password, `masterKey`, or `encKey`, so it cannot
decrypt user content.

**Trade-off:** because only the password can derive `encKey`, a forgotten
password cannot be recovered by the server — previously synced data becomes
unreadable. `change-credentials` requires the current password and re-encryption
by the client.
