-- =============================================================================
-- Drishti — Supabase migration v2
-- Run this in: Supabase dashboard → SQL Editor → New Query → Run
--
-- What this does:
--   1. Renames avg_drift  → closure_burden  (avg % eye closure during gaze phase)
--   2. Renames avg_recovery → signal_coverage (avg % time signal was valid)
--   3. Adds attention_score_avg (mean attention score over the session)
--   4. Adds blink_rate_avg     (mean blinks per minute)
--   5. Adds signal_quality_end (good | fair | poor at session end)
-- =============================================================================

-- 1. Rename misnamed columns
ALTER TABLE sessions RENAME COLUMN avg_drift     TO closure_burden;
ALTER TABLE sessions RENAME COLUMN avg_recovery  TO signal_coverage;

-- 2. Add new signal columns
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS attention_score_avg  numeric,
  ADD COLUMN IF NOT EXISTS blink_rate_avg        numeric,
  ADD COLUMN IF NOT EXISTS signal_quality_end    text;

-- Optional: add a check constraint so only valid quality values are stored.
ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_signal_quality_end_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_signal_quality_end_check
  CHECK (signal_quality_end IS NULL OR signal_quality_end IN ('good', 'fair', 'poor'));
