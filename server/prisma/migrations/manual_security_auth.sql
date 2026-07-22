-- Add KDF salt + login lockout columns for zero-knowledge auth hardening.
-- Run via: npx prisma migrate dev --name security_auth_lockout
-- Or: npx prisma db push

ALTER TABLE "users" ADD COLUMN "kdfSalt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lockedUntil" DATETIME;
