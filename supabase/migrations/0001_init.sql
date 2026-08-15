-- Artistes (liés à un compte Supabase Auth)
create table public.artists (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  instagram_handle text,
  created_at timestamptz not null default now()
);

-- Statuts possibles d'un projet
create type public.project_status as enum (
  'pending',
  'accepted',
  'deposit_paid',
  'declined'
);

-- Demandes de tatouage envoyées par les clients
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  description text not null,
  body_location text not null,
  size_cm numeric not null,
  preferred_date date not null,
  time_slot text not null,
  image_urls text[] not null default '{}',
  status public.project_status not null default 'pending',
  deposit_amount_cents integer,
  stripe_checkout_url text,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_artist_id_idx on public.projects (artist_id);
create index projects_status_idx on public.projects (status);

alter table public.artists enable row level security;
alter table public.projects enable row level security;

-- Un artiste ne voit / modifie que son propre profil
create policy "Artists can view own profile"
  on public.artists for select
  using (auth.uid() = id);

create policy "Artists can update own profile"
  on public.artists for update
  using (auth.uid() = id);

-- Un artiste ne voit / modifie que ses propres projets
-- (les insertions publiques passent par la route API avec la clé service_role,
-- qui contourne la RLS, donc aucune policy d'insertion publique n'est nécessaire ici)
create policy "Artists can view own projects"
  on public.projects for select
  using (auth.uid() = artist_id);

create policy "Artists can update own projects"
  on public.projects for update
  using (auth.uid() = artist_id);

-- Bucket de stockage pour les visuels d'inspiration
insert into storage.buckets (id, name, public)
values ('inspiration-images', 'inspiration-images', true)
on conflict (id) do nothing;

create policy "Public can view inspiration images"
  on storage.objects for select
  using (bucket_id = 'inspiration-images');
