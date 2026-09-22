-- Per-assignment instructions (from the syllabus, editable) and the student's own notes.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS notes TEXT;