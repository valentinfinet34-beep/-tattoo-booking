export type PaymentMethod = "stripe" | "external_link";

export const PAYMENT_LINK_MAX_LENGTH = 500;

type ArtistPaymentFields = {
  payment_method?: string | null;
  payment_link_url?: string | null;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean | null;
};

export function paymentMethodOf(artist: ArtistPaymentFields | null | undefined): PaymentMethod {
  return artist?.payment_method === "external_link" ? "external_link" : "stripe";
}

/** Le tatoueur a-t-il réglé un moyen d'encaisser les acomptes qui fonctionne ? */
export function canReceivePayments(artist: ArtistPaymentFields | null | undefined): boolean {
  if (!artist) return false;
  if (paymentMethodOf(artist) === "external_link") return Boolean(artist.payment_link_url);
  return Boolean(artist.stripe_account_id && artist.stripe_charges_enabled);
}

export const PAYMENT_NOT_READY_MESSAGE =
  "Choisis comment encaisser tes acomptes (Paramètres → Mes encaissements) avant de continuer.";

export type PaymentLinkResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Vérifie le lien de paiement saisi par le tatoueur : adresse https, sans
 * identifiant glissé dans l'adresse, d'une longueur raisonnable. TattFlow ne
 * peut pas vérifier que le lien est « le bon » : c'est le tatoueur qui en est
 * responsable.
 */
export function validatePaymentLink(raw: string): PaymentLinkResult {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Colle ton lien de paiement." };
  if (value.length > PAYMENT_LINK_MAX_LENGTH) {
    return { ok: false, message: "Ce lien est trop long." };
  }
  if (/\s/.test(value)) {
    return { ok: false, message: "Le lien ne doit pas contenir d'espace." };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, message: "Ce lien n'est pas valide. Il doit commencer par https://" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, message: "Le lien doit commencer par https:// (connexion sécurisée)." };
  }
  if (url.username || url.password) {
    return { ok: false, message: "Le lien ne doit pas contenir d'identifiant ni de mot de passe." };
  }
  if (!url.hostname.includes(".")) {
    return { ok: false, message: "Ce lien n'est pas valide." };
  }

  return { ok: true, url: url.toString() };
}
