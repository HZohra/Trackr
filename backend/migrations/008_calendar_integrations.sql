-- Calendar integrations
-- Google Calendar + Apple Calendar subscription infrastructure

CREATE TABLE IF NOT EXISTS calendar_integrations (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    provider VARCHAR(20) NOT NULL
        CHECK (provider IN ('google', 'apple')),

    provider_account_email VARCHAR(320),

    -- For Google this will contain the ID of the dedicated
    -- "Trackr" Google Calendar.
    external_calendar_id TEXT,

    -- Google refresh token.
    -- NEVER store the raw token.
    encrypted_refresh_token TEXT,

    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    status VARCHAR(20) NOT NULL DEFAULT 'connected'
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

    UNIQUE (user_id, provider)
);


-- Maps a Trackr event/assignment to its external calendar event.
--
-- source_type lets us support assignments now and later add:
-- exams
-- quizzes
-- study sessions
-- manual events
-- recurring classes
CREATE TABLE IF NOT EXISTS calendar_event_syncs (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    integration_id BIGINT NOT NULL
        REFERENCES calendar_integrations(id)
        ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,

    -- TEXT intentionally allows us to support different Trackr
    -- entity ID types without redesigning this table.
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

    content_hash TEXT,

    last_error TEXT,

    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (integration_id, source_type, source_id)
);


-- Protects the Google OAuth flow against forged callbacks.
CREATE TABLE IF NOT EXISTS calendar_oauth_states (
    state_hash CHAR(64) PRIMARY KEY,

    user_id BIGINT NOT NULL,

    provider VARCHAR(20) NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Secure token used by Apple Calendar to access a user's
-- read-only Trackr ICS calendar.
CREATE TABLE IF NOT EXISTS calendar_subscription_tokens (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    provider VARCHAR(20) NOT NULL DEFAULT 'apple'
        CHECK (provider = 'apple'),

    token_hash CHAR(64) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_accessed_at TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ
);


CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user
    ON calendar_integrations(user_id);


CREATE INDEX IF NOT EXISTS idx_calendar_sync_user
    ON calendar_event_syncs(user_id);


CREATE INDEX IF NOT EXISTS idx_calendar_sync_integration
    ON calendar_event_syncs(integration_id);


CREATE INDEX IF NOT EXISTS idx_calendar_subscription_user
    ON calendar_subscription_tokens(user_id);