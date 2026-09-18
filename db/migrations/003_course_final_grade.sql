ALTER TABLE courses
  ADD COLUMN final_grade DECIMAL(5,2) NULL AFTER archived,
  ADD CONSTRAINT chk_courses_final_grade
      CHECK (final_grade IS NULL OR (final_grade >= 0.00 AND final_grade <= 100.00));