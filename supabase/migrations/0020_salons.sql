-- Salons : un salon regroupe plusieurs tatoueurs. Le client ouvre la page du
-- salon (/salon/<pseudo>), choisit son tatoueur, puis continue sur la page de
-- reservation de CE tatoueur (/book/<pseudo-du-tatoueur>).
--
-- Principe de securite : le salon est une couche AU-DESSUS des tatoueurs. Rien
-- ne change pour les demandes, les devis, les paiements ou l'agenda : chaque
-- tatoueur garde ses propres donnees, isolees comme avant. Le proprietaire du
-- salon NE VOIT PAS les demandes des autres tatoueurs.
--
-- Regles :
--   * un tatoueur ne peut appartenir qu'a un seul salon ;
--   * un tatoueur ne peut creer qu'un seul salon (il en est le proprietaire) ;
--   * on rejoint un salon avec un lien d'invitation a usage unique, valable
--     7 jours, cree par le proprietaire ;
--   * 20 tatoueurs maximum par salon ;
--   * le pseudo du salon suit les memes regles que celui d'un tatoueur
--     (3 a 30 caracteres, a-z 0-9 tirets, liste de pseudos reserves) mais vit
--     dans son propre espace (/salon/...) : aucun conflit avec /book/... ;
--   * le pseudo du salon est choisi a la creation et ne change pas.
--
-- Migration ADDITIVE : elle ne modifie aucune table existante. Elle peut donc
-- etre executee avant le deploiement du code correspondant sans rien casser.
-- Reversible : voir supabase/rollback/0020_salons.down.sql.
-- A EXECUTER TEL QUEL dans Supabase > SQL Editor.

begin;

-- Les chemins /salon et /invitation-salon sont maintenant utilises par
-- l'application : ils rejoignent la liste des pseudos reserves (nouveaux
-- pseudos uniquement ; un pseudo deja pris reste valide).
create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select p_slug = any (array[
    '404', '500', 'about', 'accueil', 'account', 'admin', 'administrator',
    'agenda', 'aide', 'api', 'app', 'artist', 'artists', 'assets', 'auth',
    'billing', 'blog', 'book', 'cgu', 'compte', 'confidentialite',
    'confirmation', 'connexion', 'contact', 'cron', 'dashboard', 'demo',
    'docs', 'email', 'faq', 'false', 'favicon', 'file', 'globe', 'help',
    'home', 'icons',
    'images', 'index', 'inscription', 'legal', 'login', 'logout', 'mail',
    'manifest', 'me', 'mentions', 'mentions-legales', 'mot-de-passe-oublie',
    'new', 'next', 'null', 'opengraph-image', 'password', 'pay', 'payments',
    'preview', 'pricing', 'privacy', 'profile', 'public', 'quote',
    'register', 'reschedule', 'reservation', 'reserver', 'reset', 'robots',
    'root', 'settings', 'signin', 'signout', 'signup', 'sitemap', 'staging',
    'static', 'stats', 'status', 'stripe', 'studio', 'studios', 'supabase',
    'support', 'tarifs', 'tatoueur', 'tatoueurs', 'tattflow', 'tattooer',
    'tattoo', 'tattoos', 'terms', 'test', 'true', 'undefined', 'uploads',
    'user', 'users', 'vercel', 'webhook', 'webhooks', 'window', 'www',
    'invitation-salon', 'salon', 'salons'
  ]::text[])
$$;

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.artists(id) on delete cascade,
  slug text not null,
  name text not null,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  constraint salons_name_length_check
    check (char_length(btrim(name)) between 1 and 80),
  constraint salons_city_length_check
    check (city is null or char_length(city) <= 80),
  constraint salons_bio_length_check
    check (bio is null or char_length(bio) <= 600)
);

create unique index salons_slug_lower_key on public.salons (lower(slug));

create table public.salon_members (
  salon_id uuid not null references public.salons(id) on delete cascade,
  artist_id uuid not null unique references public.artists(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (salon_id, artist_id)
);

create index salon_members_artist_id_idx on public.salon_members (artist_id);

create table public.salon_invites (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.artists(id) on delete set null
);

create index salon_invites_salon_id_idx on public.salon_invites (salon_id);

-- Fonctions d'aide pour les regles d'acces (security definer : evite la
-- recursion infinie entre les regles des deux tables).
create or replace function public.is_salon_member(p_salon uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.salon_members m
    where m.salon_id = p_salon and m.artist_id = auth.uid()
  )
$$;

create or replace function public.is_salon_owner(p_salon uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.salons s
    where s.id = p_salon and s.owner_id = auth.uid()
  )
$$;

-- Pseudo du salon : memes regles que celui d'un tatoueur.
create or replace function public.enforce_salon_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  issue text;
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then
    return new;
  end if;

  issue := public.validate_slug(new.slug);
  if issue is not null then
    raise exception 'slug_invalid:%', issue using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.salons s
    where lower(s.slug) = lower(new.slug) and s.id is distinct from new.id
  ) then
    raise exception 'slug_invalid:taken' using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger salons_enforce_slug
  before insert or update on public.salons
  for each row execute function public.enforce_salon_slug();

-- Le createur devient membre de son propre salon. Si le createur est deja
-- membre d'un autre salon, la contrainte d'unicite annule toute la creation.
create or replace function public.add_salon_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.salon_members (salon_id, artist_id)
  values (new.id, new.owner_id);
  return new;
end;
$$;

create trigger salons_add_owner_member
  after insert on public.salons
  for each row execute function public.add_salon_owner_as_member();

-- Droits : rien pour les visiteurs. La page publique du salon est lue par le
-- serveur uniquement.
alter table public.salons enable row level security;
alter table public.salon_members enable row level security;
alter table public.salon_invites enable row level security;

revoke all on public.salons from anon, authenticated;
revoke all on public.salon_members from anon, authenticated;
revoke all on public.salon_invites from anon, authenticated;

-- Salons : un membre voit son salon ; seul le proprietaire le cree, le modifie
-- (nom, ville, presentation seulement) ou le supprime.
grant select on public.salons to authenticated;
grant insert (owner_id, slug, name, city, bio) on public.salons to authenticated;
grant update (name, city, bio) on public.salons to authenticated;
grant delete on public.salons to authenticated;

create policy "Members can read their salon"
  on public.salons for select to authenticated
  using (owner_id = auth.uid() or public.is_salon_member(id));

create policy "Artists can create their own salon"
  on public.salons for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owner can update salon"
  on public.salons for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owner can delete salon"
  on public.salons for delete to authenticated
  using (owner_id = auth.uid());

-- Membres : lecture par les membres du salon ; suppression par le proprietaire
-- (un autre membre) ou par le membre lui-meme (il quitte le salon).
grant select, delete on public.salon_members to authenticated;

create policy "Members can read their salon members"
  on public.salon_members for select to authenticated
  using (public.is_salon_member(salon_id));

create policy "Owner removes a member or member leaves"
  on public.salon_members for delete to authenticated
  using (
    (public.is_salon_owner(salon_id) and artist_id <> auth.uid())
    or (
      artist_id = auth.uid()
      and not public.is_salon_owner(salon_id)
    )
  );

-- Invitations : aucune regle pour les utilisateurs, tout passe par les
-- fonctions ci-dessous (reservees au serveur).

-- Cree une invitation. Echoue si ce tatoueur n'est pas proprietaire d'un salon.
create or replace function public.create_salon_invite(p_owner uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon uuid;
  v_token text;
begin
  select id into v_salon from public.salons where owner_id = p_owner;
  if v_salon is null then
    raise exception 'not_salon_owner' using errcode = 'insufficient_privilege';
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.salon_invites (salon_id, token) values (v_salon, v_token);
  return v_token;
end;
$$;

-- Utilise une invitation pour un tatoueur. Tout ou rien.
create or replace function public.accept_salon_invite(p_token text, p_artist uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.salon_invites%rowtype;
begin
  select * into v_invite
  from public.salon_invites
  where token = p_token
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'invite_invalid' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.salon_members where artist_id = p_artist) then
    raise exception 'already_in_salon' using errcode = 'unique_violation';
  end if;

  if (select count(*) from public.salon_members where salon_id = v_invite.salon_id) >= 20 then
    raise exception 'salon_full' using errcode = 'check_violation';
  end if;

  insert into public.salon_members (salon_id, artist_id)
  values (v_invite.salon_id, p_artist);

  update public.salon_invites
  set used_at = now(), used_by = p_artist
  where id = v_invite.id;

  return v_invite.salon_id;
end;
$$;

revoke execute on function public.create_salon_invite(uuid) from public, anon, authenticated;
revoke execute on function public.accept_salon_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.create_salon_invite(uuid) to service_role;
grant execute on function public.accept_salon_invite(text, uuid) to service_role;

-- Auto-verification : on s'arrete (et tout est annule) si les droits ne sont
-- pas ceux attendus.
do $$
begin
  if has_table_privilege('anon', 'public.salons', 'SELECT')
     or has_table_privilege('anon', 'public.salon_members', 'SELECT')
     or has_table_privilege('anon', 'public.salon_invites', 'SELECT') then
    raise exception 'Les visiteurs ne doivent pas lire les tables de salon';
  end if;

  if has_table_privilege('authenticated', 'public.salon_invites', 'SELECT')
     or has_table_privilege('authenticated', 'public.salon_invites', 'INSERT') then
    raise exception 'Les invitations doivent rester reservees au serveur';
  end if;

  if has_column_privilege('authenticated', 'public.salons', 'slug', 'UPDATE')
     or has_column_privilege('authenticated', 'public.salons', 'owner_id', 'UPDATE') then
    raise exception 'Le pseudo et le proprietaire du salon ne doivent pas etre modifiables';
  end if;

  if has_function_privilege('authenticated', 'public.accept_salon_invite(text, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.create_salon_invite(uuid)', 'EXECUTE') then
    raise exception 'Les fonctions d''invitation doivent rester reservees au serveur';
  end if;
end $$;

commit;
