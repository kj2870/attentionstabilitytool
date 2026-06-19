-- =============================================================================
-- Drishti — Supabase schema (clean start)
-- Run this once in the Supabase dashboard → SQL Editor → New query.
-- Replaces all prior schema/migration files.
--
-- What this creates:
--   - public.sessions  (one row per completed sit)
--   - Row-level security so users only see/edit their own data
--   - Indexes for fast per-user history queries
--
-- What this does NOT create:
--   - public.profiles  — vestigial in older schemas, not used by the app.
--     Usernames are read from auth.users.user_metadata directly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Clean slate. Safe to run even if these objects don't exist.
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.sessions cascade;
drop table if exists public.profiles cascade;


-- ---------------------------------------------------------------------------
-- sessions: one row per completed sit
-- ---------------------------------------------------------------------------
create table public.sessions (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  created_at              timestamptz not null default now(),

  -- Session context
  date                    text        not null,            -- ISO timestamp string from client
  duration_min            numeric     not null,            -- actual elapsed minutes (partial if ended early)
  time_of_day             text        not null default 'Night',  -- legacy, never shown in UI

  -- Outcome metrics
  attention_score         integer     not null,            -- legacy 0–100 heuristic, never shown
  grade                   text        not null,            -- legacy A | B | C, never shown
  feeling                 text,                            -- Calm | Neutral | Restless | null
  note                    text,                            -- optional free-form feedback
  new_milestones          text[],                          -- milestone IDs unlocked this sit

  -- Eye-tracking metrics (all nullable — null if camera was off)
  blink_count             integer,
  avg_drift               numeric,
  avg_recovery            numeric,
  longest_gaze_sec        integer,
  total_stillness_sec     integer,
  blink_rate_during_gaze  numeric,
  gaze_stability_samples  integer[]
);

create index sessions_user_id_created_at
  on public.sessions (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- Row-level security: each user sees and modifies only their own sits.
-- The developer (you) can still see everything via the Supabase dashboard,
-- which uses the service-role key and bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;

create policy "Users can view their own sits"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sits"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sits"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- Done. After running:
--   1. Verify the schema with:
--        select column_name, data_type, is_nullable
--        from information_schema.columns
--        where table_schema = 'public' and table_name = 'sessions'
--        order by ordinal_position;
--
--   2. Complete a sit in the app — it should land here as a new row.
--
--   3. To see your feedback notes:
--        select created_at, date, feeling, longest_gaze_sec, note
--        from sessions
--        where note is not null and trim(note) <> ''
--        order by created_at desc;
-- =============================================================================
