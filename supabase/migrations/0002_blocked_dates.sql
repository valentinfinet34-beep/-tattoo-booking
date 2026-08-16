create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  blocked_date date not null,
  created_at timestamptz not null default now(),
  unique (artist_id, blocked_date)
);

create index blocked_dates_artist_id_idx on public.blocked_dates (artist_id);

alter table public.blocked_dates enable row level security;

create policy "Artists can view own blocked dates"
  on public.blocked_dates for select
  using (auth.uid() = artist_id);

create policy "Artists can insert own blocked dates"
  on public.blocked_dates for insert
  with check (auth.uid() = artist_id);

create policy "Artists can delete own blocked dates"
  on public.blocked_dates for delete
  using (auth.uid() = artist_id);
