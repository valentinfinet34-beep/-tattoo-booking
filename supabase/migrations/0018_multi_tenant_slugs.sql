-- Multi-tenant : chaque tatoueur a son lien public /book/<pseudo>.
--
-- Cette migration ajoute, au niveau de la base (donc pour tout le monde, y
-- compris le code serveur) :
--   * des regles de format pour le pseudo (slug) : a-z, 0-9 et tirets, 3 a 30
--     caracteres, sans tiret au debut ni a la fin ;
--   * une liste de pseudos reserves (admin, api, login, tattflow, ...) ;
--   * l'unicite insensible a la casse ;
--   * un historique des anciens pseudos : pendant 90 jours, l'ancien lien
--     redirige vers le nouveau et personne d'autre ne peut le prendre ;
--   * une fonction change_artist_slug() qui fait le changement d'un seul bloc.
--
-- Les regles ne s'appliquent qu'aux NOUVEAUX pseudos et aux CHANGEMENTS : un
-- pseudo existant (par exemple "tattflow", le tenant de la beta, pourtant dans
-- la liste des pseudos reserves) reste valide et continue de fonctionner.
--
-- Reversible : voir supabase/rollback/0018_multi_tenant_slugs.down.sql.
-- A EXECUTER TEL QUEL dans Supabase > SQL Editor. Peut etre execute avant ou
-- apres le deploiement du code correspondant (le code gere l'absence de la
-- table d'historique), mais le changement de pseudo dans les reglages ne
-- fonctionne qu'une fois cette migration appliquee.

begin;

-- Verification prealable : deux pseudos qui ne different que par la casse
-- empecheraient l'unicite insensible a la casse. On s'arrete avant de toucher
-- a quoi que ce soit, avec un message clair.
do $$
declare
  duplicates text;
begin
  select string_agg(lower_slug, ', ') into duplicates
  from (
    select lower(slug) as lower_slug
    from public.artists
    group by lower(slug)
    having count(*) > 1
  ) d;

  if duplicates is not null then
    raise exception 'Deux pseudos ne different que par la casse (%) : corrige-les avant cette migration', duplicates;
  end if;
end $$;

-- Pseudos interdits pour les nouveaux comptes : mots techniques, chemins deja
-- utilises par l'application, noms de la marque et mots trop generiques.
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
    'user', 'users', 'vercel', 'webhook', 'webhooks', 'window', 'www'
  ]::text[])
$$;

-- Renvoie NULL si le pseudo est valide, sinon un code : too_short,
-- invalid_format, too_long ou reserved.
create or replace function public.validate_slug(p_slug text)
returns text
language sql
immutable
as $$
  select case
    when p_slug is null or p_slug = '' then 'too_short'
    when p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then 'invalid_format'
    when char_length(p_slug) < 3 then 'too_short'
    when char_length(p_slug) > 30 then 'too_long'
    when public.is_reserved_slug(p_slug) then 'reserved'
    else null
  end
$$;

-- Historique des anciens pseudos. Reserve au serveur : aucune lecture ni
-- ecriture possible depuis le navigateur.
create table public.artist_slug_history (
  old_slug text primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  retired_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create index artist_slug_history_artist_id_idx
  on public.artist_slug_history (artist_id);

alter table public.artist_slug_history enable row level security;
revoke all on public.artist_slug_history from anon, authenticated;

-- Unicite insensible a la casse (en plus de la contrainte existante).
create unique index artists_slug_lower_key on public.artists (lower(slug));

-- Regles appliquees a chaque nouveau pseudo et a chaque changement de pseudo.
-- Les lignes existantes ne sont pas revalidees tant que leur pseudo ne change
-- pas, ce qui laisse "tattflow" et les anciens pseudos tranquilles.
create or replace function public.enforce_artist_slug()
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

  -- Un tatoueur peut retrouver son propre ancien pseudo pendant les 90 jours,
  -- meme s'il est devenu reserve entre-temps.
  if issue = 'reserved' and exists (
    select 1 from public.artist_slug_history h
    where h.old_slug = new.slug
      and h.artist_id = new.id
      and h.expires_at > now()
  ) then
    issue := null;
  end if;

  if issue is not null then
    raise exception 'slug_invalid:%', issue using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.artist_slug_history h
    where h.old_slug = new.slug
      and h.artist_id <> new.id
      and h.expires_at > now()
  ) then
    raise exception 'slug_held' using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger artists_enforce_slug
  before insert or update of slug on public.artists
  for each row execute function public.enforce_artist_slug();

-- A l'inscription : le pseudo vient des metadonnees du compte (et il est
-- verifie par le declencheur ci-dessus). S'il manque, on en fabrique un
-- valide au lieu d'utiliser l'identifiant complet du compte (36 caracteres).
create or replace function public.handle_new_artist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.artists (id, display_name, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Studio'),
    coalesce(
      nullif(new.raw_user_meta_data->>'slug', ''),
      'tatoueur-' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  );
  return new;
end;
$$;

-- Changement de pseudo, d'un seul bloc : l'ancien pseudo est garde 90 jours
-- pour la redirection, puis le nouveau est applique. Si une etape echoue
-- (pseudo pris, reserve, mal forme...), rien n'est change.
create or replace function public.change_artist_slug(p_artist_id uuid, p_new_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_slug text;
  v_held_by uuid;
begin
  select slug into v_old_slug
  from public.artists
  where id = p_artist_id
  for update;

  if not found then
    raise exception 'artist_not_found' using errcode = 'no_data_found';
  end if;

  if v_old_slug = p_new_slug then
    return v_old_slug;
  end if;

  select artist_id into v_held_by
  from public.artist_slug_history
  where old_slug = p_new_slug and expires_at > now();

  if v_held_by is not null and v_held_by <> p_artist_id then
    raise exception 'slug_held' using errcode = 'unique_violation';
  end if;

  insert into public.artist_slug_history (old_slug, artist_id, retired_at, expires_at)
  values (v_old_slug, p_artist_id, now(), now() + interval '90 days')
  on conflict (old_slug) do update
    set artist_id = excluded.artist_id,
        retired_at = excluded.retired_at,
        expires_at = excluded.expires_at;

  update public.artists set slug = p_new_slug where id = p_artist_id;

  -- Si le tatoueur reprend un de ses anciens pseudos, il n'a plus a etre redirige.
  delete from public.artist_slug_history
  where old_slug = p_new_slug and artist_id = p_artist_id;

  return p_new_slug;
end;
$$;

-- Ces fonctions ne sont appelables que par le serveur (cle service_role).
revoke all on function public.is_reserved_slug(text) from public, anon, authenticated;
revoke all on function public.validate_slug(text) from public, anon, authenticated;
revoke all on function public.enforce_artist_slug() from public, anon, authenticated;
revoke all on function public.change_artist_slug(uuid, text) from public, anon, authenticated;
grant execute on function public.is_reserved_slug(text) to service_role;
grant execute on function public.validate_slug(text) to service_role;
grant execute on function public.change_artist_slug(uuid, text) to service_role;

-- Une demande modifiee doit rester celle du meme tatoueur (le comportement
-- etait deja celui-la par defaut ; on le rend explicite).
alter policy "Artists can update own projects"
  on public.projects
  using (auth.uid() = artist_id)
  with check (auth.uid() = artist_id);

-- Auto-verification : si un element manque ou se comporte autrement, une erreur
-- annule toute la migration.
do $$
begin
  if public.validate_slug('ab') is distinct from 'too_short'
     or public.validate_slug('Abc') is distinct from 'invalid_format'
     or public.validate_slug(repeat('a', 31)) is distinct from 'too_long'
     or public.validate_slug('admin') is distinct from 'reserved'
     or public.validate_slug('tattflow') is distinct from 'reserved'
     or public.validate_slug('mon-studio-2') is not null then
    raise exception 'validate_slug ne se comporte pas comme prevu';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'artists_enforce_slug')
     or not exists (select 1 from pg_indexes where indexname = 'artists_slug_lower_key')
     or to_regclass('public.artist_slug_history') is null then
    raise exception 'Un element de la migration 0018 est absent';
  end if;

  if has_table_privilege('authenticated', 'public.artist_slug_history', 'SELECT')
     or has_table_privilege('anon', 'public.artist_slug_history', 'SELECT') then
    raise exception 'artist_slug_history ne doit pas etre lisible depuis le navigateur';
  end if;

  if has_function_privilege('authenticated', 'public.change_artist_slug(uuid, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.change_artist_slug(uuid, text)', 'EXECUTE') then
    raise exception 'change_artist_slug ne doit etre appelable que par le serveur';
  end if;
end $$;

commit;
