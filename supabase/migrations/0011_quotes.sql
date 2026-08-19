-- Systeme de devis en 2 temps : le tatoueur propose un prix estime (sans
-- s'engager sur l'acompte), le client accepte ou decline par email/lien
-- public. A l'acceptation, l'acompte est calcule automatiquement a partir
-- du reglage par defaut du tatoueur (deposit_type/deposit_percentage).
alter type project_status add value if not exists 'quoted';
alter type project_status add value if not exists 'quote_declined';

alter table public.projects add column if not exists quoted_price_cents integer;
