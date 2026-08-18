-- Stripe Connect : compte de chaque artiste pour recevoir directement
-- les acomptes de ses clients (0% de commission).
alter table public.artists add column if not exists stripe_account_id text;
alter table public.artists add column if not exists stripe_charges_enabled boolean not null default false;

-- Abonnement SaaS : l'artiste paie la plateforme pour utiliser l'outil.
alter table public.artists add column if not exists stripe_customer_id text;
alter table public.artists add column if not exists stripe_subscription_id text;
alter table public.artists add column if not exists subscription_status text;
