-- Galerie de realisations (3-4 photos) affichee en haut de la page de
-- reservation publique, avec le profil du tatoueur (photo, nom, ville, bio).
alter table public.artists add column if not exists portfolio_images text[] not null default '{}';
