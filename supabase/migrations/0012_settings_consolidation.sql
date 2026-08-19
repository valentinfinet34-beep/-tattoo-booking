-- Consolidation des parametres tatoueur en 7 sections : profil, page
-- client, acomptes, disponibilites, notifications, stripe, abonnement.

-- Section 1 : profil
alter table public.artists add column if not exists avatar_url text;
alter table public.artists add column if not exists city text;
alter table public.artists add column if not exists bio text;

-- Section 2 : page client
alter table public.artists add column if not exists welcome_message text;
alter table public.artists add column if not exists practiced_styles text[] not null default '{}';

-- Section 3 : acomptes
alter table public.artists add column if not exists deposit_expiry_hours integer not null default 48;

-- Section 4 : disponibilites (0=dimanche .. 6=samedi, comme Date.getDay())
alter table public.artists add column if not exists working_days integer[] not null default '{1,2,3,4,5,6}';
alter table public.artists add column if not exists hours_start integer not null default 9;
alter table public.artists add column if not exists hours_end integer not null default 19;
alter table public.artists add column if not exists min_lead_days integer not null default 0;

-- Section 5 : notifications
alter table public.artists add column if not exists notify_new_request boolean not null default true;
alter table public.artists add column if not exists notify_quote_accepted boolean not null default true;
alter table public.artists add column if not exists notify_deposit_paid boolean not null default true;
alter table public.artists add column if not exists notify_reminder_24h boolean not null default true;

-- Expiration du lien d'acompte
alter table public.projects add column if not exists deposit_expires_at timestamptz;
alter type project_status add value if not exists 'expired';
