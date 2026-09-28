CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    timezone VARCHAR(100) NOT NULL
        DEFAULT 'America/Toronto',

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS
    trg_user_preferences_updated_at
ON user_preferences;


CREATE TRIGGER
    trg_user_preferences_updated_at
BEFORE UPDATE
ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION
    update_user_preferences_updated_at();