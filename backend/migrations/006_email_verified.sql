-- Email verification: new accounts start unverified and cannot log in until they
-- click the emailed link. Existing accounts are grandfathered as verified so this
-- rollout doesn't lock anyone out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET email_verified = TRUE;