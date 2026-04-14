-- Recurrence for sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly'));
