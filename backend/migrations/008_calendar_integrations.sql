-- 008_calendar_integrations.sql
-- Google Calendar + Apple Calendar integration infrastructure.


-- ============================================================
-- CALENDAR INTEGRATIONS
-- Stores a user's connection to Google or Apple Calendar.
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_integrations (
    id BIGSERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    provider VARCHAR(20) NOT NULL
        CHECK (provider IN ('google', 'apple')),

    provider_account_email VARCHAR(320),

    -- For Google this contains the ID of the dedicated
    -- "Trackr" calendar created in the user's Google account.
    external_calendar_id TEXT,

    -- Google refresh tokens are encrypted before storage.
    encrypted_refresh_token TEXT,

    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    status VARCHAR(30) NOT NULL DEFAULT 'connected'
        CHECK (
            status IN (
                'connected',
                'disconnected',
                'error',
                'reauthorization_required'
            )
        ),

    last_synced_at TIMESTAMPTZ,

    last_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_calendar_integration_user_provider
        UNIQUE (user_id, provider)
);


-- Keep updated_at current automatically.
CREATE TRIGGER trg_calendar_integrations_updated_at
BEFORE UPDATE ON calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();



-- ============================================================
-- CALENDAR EVENT SYNCS
--
-- Maps a Trackr item to the corresponding external event.
--
-- source_type examples:
-- activity
-- exam
-- quiz
-- study_session
-- manual_event
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_event_syncs (
    id BIGSERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    integration_id BIGINT NOT NULL
        REFERENCES calendar_integrations(id)
        ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,

    source_id TEXT NOT NULL,

    external_event_id TEXT NOT NULL,

    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced'
        CHECK (
            sync_status IN (
                'synced',
                'pending',
                'error',
                'deleted'
            )
        ),

    -- Allows us to detect whether an item actually changed
    -- before sending another external API update.
    content_hash TEXT,

    last_error TEXT,

    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_calendar_event_sync
        UNIQUE (
            integration_id,
            source_type,
            source_id
        )
);


CREATE TRIGGER trg_calendar_event_syncs_updated_at
BEFORE UPDATE ON calendar_event_syncs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();



-- ============================================================
-- GOOGLE OAUTH STATES
--
-- Temporary state values protect the Google OAuth callback
-- from CSRF / account-mixup attacks.
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_oauth_states (
    state_hash CHAR(64) PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    provider VARCHAR(20) NOT NULL
        CHECK (provider = 'google'),

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



-- ============================================================
-- APPLE CALENDAR SUBSCRIPTION TOKENS
--
-- Apple Calendar will subscribe to a private Trackr ICS URL.
-- We store only the hash of the subscription token.
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_subscription_tokens (
    id BIGSERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    provider VARCHAR(20) NOT NULL DEFAULT 'apple'
        CHECK (provider = 'apple'),

    token_hash CHAR(64) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_accessed_at TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ
);



-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user
    ON calendar_integrations(user_id);


CREATE INDEX IF NOT EXISTS idx_calendar_event_syncs_user
    ON calendar_event_syncs(user_id);


CREATE INDEX IF NOT EXISTS idx_calendar_event_syncs_integration
    ON calendar_event_syncs(integration_id);


CREATE INDEX IF NOT EXISTS idx_calendar_oauth_states_user
    ON calendar_oauth_states(user_id);


CREATE INDEX IF NOT EXISTS idx_calendar_oauth_states_expires
    ON calendar_oauth_states(expires_at);


CREATE INDEX IF NOT EXISTS idx_calendar_subscription_tokens_user
    ON calendar_subscription_tokens(user_id);