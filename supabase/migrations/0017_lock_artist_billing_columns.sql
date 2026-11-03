-- Securite : un tatoueur connecte pouvait modifier lui-meme sa ligne "artists"
-- en entier depuis le navigateur (cle publique + sa session), y compris
-- subscription_status, subscription_plan et les identifiants Stripe. Il
-- pouvait donc se declarer abonne (ou "pro") sans payer.
--
-- Cette migration ne laisse au tatoueur que les colonnes de reglages et de
-- profil. Les colonnes d'abonnement, de Stripe et d'identite (id, slug,
-- created_at) ne sont plus ecrites que par le serveur (cle service_role, qui
-- n'est pas concernee par ces droits).
--
-- A EXECUTER TEL QUEL dans Supabase > SQL Editor, APRES avoir deploye le code
-- qui ecrit stripe_customer_id, stripe_account_id et stripe_charges_enabled
-- via la cle service_role. Fait dans l'autre ordre, la connexion Stripe et
-- le demarrage de l'abonnement echoueraient a enregistrer leurs identifiants.
--
-- Toute nouvelle colonne que le tatoueur doit pouvoir modifier doit etre
-- ajoutee ici avec un nouveau "grant update (...)" : par defaut, elle est
-- verrouillee.

begin;

-- La nouvelle valeur d'une ligne modifiee doit elle aussi appartenir au tatoueur.
alter policy "Artists can update own profile"
  on public.artists
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- On retire tout droit de modification, puis on rend uniquement les reglages.
revoke update on public.artists from anon, authenticated;

grant update (
  display_name,
  instagram_handle,
  city,
  bio,
  avatar_url,
  cover_image_url,
  portfolio_images,
  accent_color,
  welcome_message,
  practiced_styles,
  deposit_type,
  deposit_percentage,
  deposit_fixed_amount_cents,
  deposit_expiry_hours,
  working_days,
  hours_start,
  hours_end,
  min_lead_days,
  notify_new_request,
  notify_quote_accepted,
  notify_deposit_paid,
  notify_reminder_24h
) on public.artists to authenticated;

-- Auto-verification : si le resultat n'est pas exactement celui attendu, une
-- erreur annule toute la migration (rien n'est applique).
do $$
declare
  col text;
begin
  foreach col in array array[
    'id', 'slug', 'created_at',
    'stripe_account_id', 'stripe_charges_enabled', 'stripe_customer_id',
    'stripe_subscription_id', 'subscription_status', 'subscription_plan'
  ] loop
    if has_column_privilege('authenticated', 'public.artists', col, 'UPDATE')
       or has_column_privilege('anon', 'public.artists', col, 'UPDATE') then
      raise exception 'Colonne % encore modifiable par un utilisateur', col;
    end if;
  end loop;

  foreach col in array array[
    'display_name', 'instagram_handle', 'city', 'bio', 'avatar_url',
    'cover_image_url', 'portfolio_images', 'accent_color', 'welcome_message',
    'practiced_styles', 'deposit_type', 'deposit_percentage',
    'deposit_fixed_amount_cents', 'deposit_expiry_hours', 'working_days',
    'hours_start', 'hours_end', 'min_lead_days', 'notify_new_request',
    'notify_quote_accepted', 'notify_deposit_paid', 'notify_reminder_24h'
  ] loop
    if not has_column_privilege('authenticated', 'public.artists', col, 'UPDATE') then
      raise exception 'Colonne % devrait rester modifiable par le tatoueur', col;
    end if;
  end loop;
end $$;

commit;
