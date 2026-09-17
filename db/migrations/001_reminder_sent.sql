ALTER TABLE activities
  ADD COLUMN reminder_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER reminder_method;

CREATE INDEX idx_activities_reminder_due ON activities (reminder_sent, reminder_date);