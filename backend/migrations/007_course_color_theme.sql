ALTER TABLE courses
ADD COLUMN IF NOT EXISTS color_theme VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'courses_color_theme_check'
    ) THEN
        ALTER TABLE courses
        ADD CONSTRAINT courses_color_theme_check
        CHECK (
            color_theme IS NULL
            OR color_theme IN (
                'sky',
                'violet',
                'amber',
                'coral',
                'teal',
                'lime',
                'rose',
                'slate'
            )
        );
    END IF;
END $$;