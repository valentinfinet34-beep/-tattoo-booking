alter table public.artists add column slug text;

-- Rattache l'artiste existant (compte de test) à un slug pour ne pas
-- casser son lien de réservation actuel.
update public.artists
set slug = 'tattflow'
where id = '54cca618-ee61-48e9-93be-d995160d9ee7';

alter table public.artists alter column slug set not null;
alter table public.artists add constraint artists_slug_unique unique (slug);

-- Crée automatiquement la ligne "artists" quand un nouvel utilisateur
-- s'inscrit (le nom du studio et le slug arrivent via les métadonnées
-- passées à supabase.auth.signUp()).
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_artist();
