-- Retour arriere de la migration 0019 : remet la base dans l'etat de 0018.
--
-- Ce qui est perdu : le choix du moyen d'encaissement (liens externes) et le
-- moyen memorise sur chaque demande. Les tatoueurs qui encaissaient via un lien
-- externe devront se connecter a Stripe pour accepter de nouveaux devis.
--
-- Hors du dossier supabase/migrations pour ne jamais etre applique par erreur.

begin;

alter table public.projects
  drop constraint if exists projects_payment_method_check,
  drop column if exists payment_method;

alter table public.artists
  drop constraint if exists artists_external_needs_link_check,
  drop constraint if exists artists_payment_link_check,
  drop constraint if exists artists_payment_method_check,
  drop column if exists payment_link_url,
  drop column if exists payment_method;

commit;
