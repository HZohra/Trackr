ALTER TABLE courses
  ADD COLUMN term_end DATE NULL AFTER term,
  ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0 AFTER gpa_goal;

CREATE INDEX idx_courses_user_archived ON courses (user_id, archived);