-- Run this once in Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  time_used_seconds integer,
  timed_out boolean default false,

  -- raw behavioral trace: one JSON array, one entry per task decision
  -- kept as jsonb so you can re-derive scores later if scoring logic changes
  decisions jsonb not null default '[]'::jsonb,

  -- computed subscores, 0-1 scale
  score_automation_seeking numeric,
  score_judgment numeric,
  score_critical_evaluation numeric,
  score_error_recovery numeric,
  score_readiness numeric, -- overall composite: mean of the 4 dimensions above

  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Players can insert their own sessions
create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- Players can read their own sessions (e.g. to show a "you've completed this" state)
create policy "Users can read own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

-- Players can update their own in-progress session (to mark completion)
create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- No delete policy: sessions are permanent records once written.

-- ---------- Admin dashboard support ----------

-- List of user_ids allowed to see everyone's results.
-- After you (the creator) log in once, find your id in
-- Supabase → Authentication → Users, then run:
--   insert into public.admins (user_id) values ('paste-your-id-here');
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id)
);

alter table public.admins enable row level security;

create policy "Admins can read the admins table"
  on public.admins for select
  using (auth.uid() = user_id);

-- Let admins read every row in sessions (in addition to the existing
-- "read own sessions" policy — Postgres OR's multiple select policies together).
create policy "Admins can read all sessions"
  on public.sessions for select
  using (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- auth.users isn't exposed to the client directly, so admins need a function
-- to see *which* player each session belongs to. This function checks
-- admin status itself, so it's safe to expose to any logged-in user.
-- If you already ran a previous version of this schema, run this once to
-- add the new column without losing existing data:
--   alter table public.sessions add column if not exists score_readiness numeric;

create or replace function public.get_all_sessions_with_email()
returns table (
  id uuid,
  user_id uuid,
  email text,
  started_at timestamptz,
  completed_at timestamptz,
  time_used_seconds integer,
  timed_out boolean,
  decisions jsonb,
  score_automation_seeking numeric,
  score_judgment numeric,
  score_critical_evaluation numeric,
  score_error_recovery numeric,
  score_readiness numeric
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.user_id, u.email, s.started_at, s.completed_at,
         s.time_used_seconds, s.timed_out, s.decisions,
         s.score_automation_seeking, s.score_judgment,
         s.score_critical_evaluation, s.score_error_recovery,
         s.score_readiness
  from public.sessions s
  join auth.users u on u.id = s.user_id
  where exists (select 1 from public.admins a where a.user_id = auth.uid())
  order by s.completed_at desc nulls last;
$$;

grant execute on function public.get_all_sessions_with_email() to authenticated;
