-- La taille passe d'un nombre en cm a une categorie (plus realiste pour
-- un client qui ne connait pas la taille exacte de son projet).
alter table public.projects alter column size_cm drop not null;
alter table public.projects add column if not exists size_category text;
alter table public.projects add column if not exists style text;
alter table public.projects add column if not exists color_mode text;
