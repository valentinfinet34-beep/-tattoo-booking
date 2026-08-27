-- Suivi des no-shows (formule Pro) : le tatoueur marque un rendez-vous
-- passe comme absence client, sans changer son statut de paiement.
alter table public.projects add column if not exists no_show boolean not null default false;
