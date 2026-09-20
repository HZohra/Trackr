-- 002_more_categories.sql — add Lab and Other assignment categories.
INSERT INTO activity_categories (activity_category_name)
VALUES ('Lab'), ('Other')
ON CONFLICT (activity_category_name) DO NOTHING;