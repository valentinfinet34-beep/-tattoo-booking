-- Permet au tatoueur de creer directement une demande depuis son
-- dashboard (client rencontre en personne, au telephone...), en plus
-- des demandes soumises via le formulaire public.
create policy "Artists can insert own projects"
  on public.projects for insert
  with check (auth.uid() = artist_id);
