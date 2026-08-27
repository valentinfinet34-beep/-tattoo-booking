-- Formules d'abonnement : Normal (19e/mois) et Pro (35e/mois). Max
-- (multi-tatoueurs par studio) reste un chantier separe pour plus tard.
alter table public.artists add column if not exists subscription_plan text;
