-- Moyen d'encaissement des acomptes : chaque tatoueur choisit entre Stripe
-- (comportement actuel, par defaut) et un lien de paiement externe de son
-- choix (PayPal.me, Lydia, Revolut, SumUp...). Avec un lien externe, TattFlow
-- ne touche jamais a l'argent : le client est envoye sur le lien, et le
-- tatoueur confirme lui-meme la reception de l'acompte dans son tableau de bord.
--
-- Migration ADDITIVE : tout le monde reste sur "stripe" par defaut, l'ancien
-- code continue de fonctionner. A executer AVANT le deploiement du code qui
-- utilise ces colonnes (sinon ce code echouerait a lire des colonnes absentes).
--
-- Reversible : voir supabase/rollback/0019_payment_method.down.sql.
-- A EXECUTER TEL QUEL dans Supabase > SQL Editor.

begin;

alter table public.artists
  add column payment_method text not null default 'stripe',
  add column payment_link_url text;

alter table public.artists
  add constraint artists_payment_method_check
    check (payment_method in ('stripe', 'external_link')),
  add constraint artists_payment_link_check
    check (
      payment_link_url is null
      or (payment_link_url ~ '^https://[^[:space:]]+$' and char_length(payment_link_url) <= 500)
    ),
  add constraint artists_external_needs_link_check
    check (payment_method <> 'external_link' or payment_link_url is not null);

-- Moyen utilise pour chaque demande : fige au moment de l'acceptation du devis,
-- pour qu'un changement de reglage n'affecte pas les demandes en cours.
alter table public.projects
  add column payment_method text not null default 'stripe';

alter table public.projects
  add constraint projects_payment_method_check
    check (payment_method in ('stripe', 'external_link'));

-- Le tatoueur peut regler son moyen d'encaissement (comme ses autres reglages,
-- cf. migration 0017 : par defaut une nouvelle colonne est verrouillee).
grant update (payment_method, payment_link_url) on public.artists to authenticated;

-- Auto-verification : tout est annule si le resultat n'est pas celui attendu.
do $$
begin
  if not has_column_privilege('authenticated', 'public.artists', 'payment_method', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.artists', 'payment_link_url', 'UPDATE') then
    raise exception 'Le tatoueur doit pouvoir modifier son moyen d''encaissement';
  end if;

  if has_column_privilege('authenticated', 'public.artists', 'subscription_status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.artists', 'stripe_account_id', 'UPDATE') then
    raise exception 'Les colonnes d''abonnement et Stripe doivent rester verrouillees';
  end if;

  if exists (select 1 from public.artists where payment_method <> 'stripe') then
    raise exception 'Tous les tatoueurs existants doivent rester sur Stripe';
  end if;
end $$;

commit;
