-- Horodatage de l'acceptation des conditions d'annulation par le client,
-- juste avant le paiement de l'acompte (case a cocher sur /pay/[id]).
-- Sert de preuve en cas de litige.
alter table public.projects add column if not exists deposit_terms_accepted_at timestamptz;
