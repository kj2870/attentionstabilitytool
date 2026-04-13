-- ============================================================
-- Drishti — Supabase Database Schema
-- Run this in your Supabase project's SQL Editor:
--   https://app.supabase.com → your project → SQL Editor → New query
-- ============================================================


-- ------------------------------------------------------------
-- SESSIONS TABLE
-- Stores one row per completed meditation session per user.
-- ------------------------------------------------------------
create table if not exists public.sessions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),

  -- Session context
  date            text        not null,  -- ISO 8601 timestamp string from client
  duration_min    numeric     not null,
  time_of_day     text        not null,  -- 'Morning' | 'Midday' | 'Night'

  -- Core output metrics
  attention_score integer     not null,  -- 0–100 heuristic score
  grade           text        not null,  -- 'A' | 'B' | 'C'
  feeling         text,                  -- 'Calm' | 'Neutral' | 'Restless' | null

  -- Eye-tracking derived metrics (nullable — may be absent if camera off)
  blink_count     integer,
  avg_drift       numeric,
  avg_recovery    numeric
);

-- Index for fast per-user history queries
create index if not exists sessions_user_id_created_at
  on public.sessions (user_id, created_at desc);


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Users can only read and write their own sessions.
-- You (as admin) can see everything via the Supabase dashboard.
-- ------------------------------------------------------------
alter table public.sessions enable row level security;

create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- PROFILES TABLE
-- Stores display names linked to auth.users.
-- Created automatically via trigger on signup.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        not null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone logged in can read profiles (needed for future social features)
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can only insert/update their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ------------------------------------------------------------
-- TRIGGER: auto-create profile on signup
-- Pulls username from user_metadata (set during signUp call).
-- ------------------------------------------------------------
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
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

-- Drop + recreate to avoid duplicate trigger errors on re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- DONE. After running this:
-- 1. Go to Authentication → Settings → turn OFF "Enable email confirmations"
--    (you can turn it back on later for production)
-- 2. Copy your Project URL and anon key into your .env file
-- ============================================================
