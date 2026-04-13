-- Add optional entry fee to sessions (in euro cents, 0 = free)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS entry_fee_cents INTEGER NOT NULL DEFAULT 0;
