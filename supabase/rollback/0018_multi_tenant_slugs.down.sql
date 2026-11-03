-- Retour arriere de la migration 0018 : remet la base dans l'etat de la
-- migration 0017. A utiliser seulement si 0018 pose probleme.
--
-- Ce qui est perdu : l'historique des anciens pseudos (les anciens liens
-- cessent donc de rediriger). Les pseudos eux-memes ne sont pas touches : un
-- pseudo change depuis 0018 reste le nouveau pseudo.
--
-- Ce fichier est volontairement hors du dossier supabase/migrations pour ne
-- jamais etre applique par erreur dans l'ordre normal.

begin;

drop trigger if exists artists_enforce_slug on public.artists;

drop function if exists public.change_artist_slug(uuid, text);
drop function if exists public.enforce_artist_slug();
drop function if exists public.validate_slug(text);
drop function if exists public.is_reserved_slug(text);

drop index if exists public.artists_slug_lower_key;
drop table if exists public.artist_slug_history;

-- Version d'origine (migration 0004) du declencheur d'inscription.
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
    coalesce(new.raw_user_meta_data->>'slug', new.id::text)
  );
  return new;
end;
$$;

-- Version d'origine (migration 0001) de la regle de mise a jour des demandes.
drop policy if exists "Artists can update own projects" on public.projects;
create policy "Artists can update own projects"
  on public.projects for update
  using (auth.uid() = artist_id);

commit;
