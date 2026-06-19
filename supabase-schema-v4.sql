-- =============================================================================
-- Drishti — Supabase schema (clean start)
-- Run this once in the Supabase dashboard → SQL Editor → New query.
-- Replaces all prior schema/migration files.
--
-- What this creates:
--   - public.sessions  (one row per completed sit)
--   - public.profiles  (one row per signed-in user — username lookup)
--   - Row-level security so users only see/edit their own data
--   - Auto-create trigger so a profile row is made on every Google signup
--   - Indexes for fast per-user history queries
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

  -- Subjective + free-form
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
-- profiles: username lookup, one row per user
-- Useful in the dashboard so rows aren't anonymous UUIDs.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        not null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Row-level security: each user sees and modifies only their own data.
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

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row appears.
-- Pulls the display name from Google OAuth metadata, falling back to the
-- email's local-part.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================================
-- Done. After running:
--   1. Verify the schema:
--        select column_name, data_type, is_nullable
--        from information_schema.columns
--        where table_schema = 'public' and table_name = 'sessions'
--        order by ordinal_position;
--
--   2. Sign into the app — a profile row should appear in public.profiles.
--
--   3. Complete a sit — a row should appear in public.sessions.
--
--   4. See sits with usernames in one view:
--        select p.username, s.date, s.duration_min, s.longest_gaze_sec,
--               s.blink_rate_during_gaze, s.feeling, s.note
--        from sessions s
--        join profiles p on p.id = s.user_id
--        order by s.created_at desc;
--
--   5. Just feedback notes:
--        select p.username, s.created_at, s.feeling, s.longest_gaze_sec, s.note
--        from sessions s
--        join profiles p on p.id = s.user_id
--        where s.note is not null and trim(s.note) <> ''
--        order by s.created_at desc;
-- =============================================================================
