-- Retour arriere de la migration 0020 : remet la base dans l'etat de 0019.
--
-- Ce qui est perdu : les salons, leurs membres et leurs invitations. Les
-- tatoueurs, leurs demandes, devis et paiements ne sont PAS touches.
--
-- Hors du dossier supabase/migrations pour ne jamais etre applique par erreur.

begin;

-- Remet la liste des pseudos reserves telle qu'elle etait en 0018.
create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select p_slug = any (array[
    '404', '500', 'about', 'accueil', 'account', 'admin', 'administrator',
    'agenda', 'aide', 'api', 'app', 'artist', 'artists', 'assets', 'auth',
    'billing', 'blog', 'book', 'cgu', 'compte', 'confidentialite',
    'confirmation', 'connexion', 'contact', 'cron', 'dashboard', 'demo',
    'docs', 'email', 'faq', 'false', 'favicon', 'file', 'globe', 'help',
    'home', 'icons',
    'images', 'index', 'inscription', 'legal', 'login', 'logout', 'mail',
    'manifest', 'me', 'mentions', 'mentions-legales', 'mot-de-passe-oublie',
    'new', 'next', 'null', 'opengraph-image', 'password', 'pay', 'payments',
    'preview', 'pricing', 'privacy', 'profile', 'public', 'quote',
    'register', 'reschedule', 'reservation', 'reserver', 'reset', 'robots',
    'root', 'settings', 'signin', 'signout', 'signup', 'sitemap', 'staging',
    'static', 'stats', 'status', 'stripe', 'studio', 'studios', 'supabase',
    'support', 'tarifs', 'tatoueur', 'tatoueurs', 'tattflow', 'tattooer',
    'tattoo', 'tattoos', 'terms', 'test', 'true', 'undefined', 'uploads',
    'user', 'users', 'vercel', 'webhook', 'webhooks', 'window', 'www'
  ]::text[])
$$;

drop function if exists public.accept_salon_invite(text, uuid);
drop function if exists public.create_salon_invite(uuid);
drop table if exists public.salon_invites;
drop table if exists public.salon_members;
drop table if exists public.salons;
drop function if exists public.add_salon_owner_as_member();
drop function if exists public.enforce_salon_slug();
drop function if exists public.is_salon_owner(uuid);
drop function if exists public.is_salon_member(uuid);

commit;
