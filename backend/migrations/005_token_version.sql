-- Session invalidation: bump this on every password change/reset. Tokens carry
-- the version they were minted with; verifyToken rejects any that are stale.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;