-- Some assignments have no scheduled date yet (unannounced quizzes, a TBD
-- in-class test). Allow due_date to be null so they can still be tracked;
-- the app's views already handle dateless items.
ALTER TABLE activities ALTER COLUMN due_date DROP NOT NULL;