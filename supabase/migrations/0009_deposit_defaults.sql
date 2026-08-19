-- Reglage d'acompte par defaut du tatoueur : pourcentage du prix total,
-- ou montant fixe. S'applique automatiquement a l'acceptation d'un
-- projet, toujours modifiable manuellement au cas par cas.
alter table public.artists add column if not exists deposit_type text not null default 'percentage';
alter table public.artists add column if not exists deposit_percentage numeric not null default 20;
alter table public.artists add column if not exists deposit_fixed_amount_cents integer;
