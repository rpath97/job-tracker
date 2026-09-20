create table if not exists public.jobs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text not null,
  date date,
  "column" text not null check ("column" in ('backlog', 'applied', 'interviews', 'offers')),
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

drop policy if exists "Users can view their own jobs" on public.jobs;
create policy "Users can view their own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own jobs" on public.jobs;
create policy "Users can insert their own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs"
  on public.jobs for delete
  using (auth.uid() = user_id);

create index if not exists jobs_user_id_idx on public.jobs(user_id);
