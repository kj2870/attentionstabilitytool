-- =============================================================================
-- Drishti — Supabase migration v3
-- Run this in: Supabase dashboard → SQL Editor → New Query → Run
--
-- What this does:
--   1. Ensures the column names the app writes actually exist
--      (undoes the v2 renames if they were applied — the app still writes
--       avg_drift / avg_recovery).
--   2. Adds the two newer gaze metrics the History page is built on:
--        blink_rate_during_gaze  — blinks/min averaged over gaze phases
--        gaze_stability_samples  — per-second 0/1 steadiness samples
--   3. Tightens the profiles SELECT policy: users can only read their own
--      profile (the "readable by all authenticated users" policy predates
--      any social features and exposed usernames unnecessarily).
--
-- Safe to re-run.
-- =============================================================================

-- 1. Restore column names the app writes (no-ops if v2 was never applied).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'sessions' and column_name = 'closure_burden') then
    alter table public.sessions rename column closure_burden to avg_drift;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name = 'sessions' and column_name = 'signal_coverage') then
    alter table public.sessions rename column signal_coverage to avg_recovery;
  end if;
end $$;

alter table public.sessions
  add column if not exists avg_drift numeric,
  add column if not exists avg_recovery numeric;

-- 2. New gaze metric columns.
alter table public.sessions
  add column if not exists blink_rate_during_gaze numeric,
  add column if not exists gaze_stability_samples integer[];

-- 3. Profiles: own-row reads only.
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4. Sessions: allow note updates on own rows (summary screen patches the
--    note in after the auto-save).
drop policy if exists "Users can update their own sessions" on public.sessions;
create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
