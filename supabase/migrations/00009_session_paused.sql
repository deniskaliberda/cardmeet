-- Add 'paused' status to sessions
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled', 'paused'));
