/**
 * Règles du pseudo (slug) d'un tatoueur : son lien public est /book/<pseudo>.
 * Ces règles sont aussi appliquées par la base (migration 0018) : ce fichier
 * sert à donner une réponse immédiate et claire dans l'interface.
 */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 30;
export const SLUG_HISTORY_DAYS = 90;

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Même liste que public.is_reserved_slug() dans la migration 0018. */
export const RESERVED_SLUGS: readonly string[] = [
  "404", "500", "about", "accueil", "account", "admin", "administrator",
  "agenda", "aide", "api", "app", "artist", "artists", "assets", "auth",
  "billing", "blog", "book", "cgu", "compte", "confidentialite",
  "confirmation", "connexion", "contact", "cron", "dashboard", "demo",
  "docs", "email", "faq", "false", "favicon", "file", "globe", "help",
  "home", "icons",
  "images", "index", "inscription", "legal", "login", "logout", "mail",
  "manifest", "me", "mentions", "mentions-legales", "mot-de-passe-oublie",
  "new", "next", "null", "opengraph-image", "password", "pay", "payments",
  "preview", "pricing", "privacy", "profile", "public", "quote",
  "register", "reschedule", "reservation", "reserver", "reset", "robots",
  "root", "settings", "signin", "signout", "signup", "sitemap", "staging",
  "static", "stats", "status", "stripe", "studio", "studios", "supabase",
  "support", "tarifs", "tatoueur", "tatoueurs", "tattflow", "tattooer",
  "tattoo", "tattoos", "terms", "test", "true", "undefined", "uploads",
  "user", "users", "vercel", "webhook", "webhooks", "window", "www",
];

export type SlugIssue =
  | "too_short"
  | "too_long"
  | "invalid_format"
  | "reserved"
  | "taken"
  | "held";

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}

/** Renvoie null si le pseudo est valide, sinon la raison. Même ordre que la base. */
export function validateSlug(slug: string): SlugIssue | null {
  if (slug === "") return "too_short";
  if (!SLUG_REGEX.test(slug)) return "invalid_format";
  if (slug.length < SLUG_MIN_LENGTH) return "too_short";
  if (slug.length > SLUG_MAX_LENGTH) return "too_long";
  if (isReservedSlug(slug)) return "reserved";
  return null;
}

const ISSUE_MESSAGES: Record<SlugIssue, string> = {
  too_short: `Ton lien doit faire au moins ${SLUG_MIN_LENGTH} caractères.`,
  too_long: `Ton lien est trop long (${SLUG_MAX_LENGTH} caractères maximum).`,
  invalid_format:
    "Utilise seulement des lettres minuscules sans accent, des chiffres et des tirets (pas de tiret au début ni à la fin).",
  reserved: "Ce nom est réservé, choisis-en un autre.",
  taken: "Ce nom est déjà pris par un autre tatoueur.",
  held: "Ce nom vient d'être libéré par un autre tatoueur et reste réservé quelques semaines. Choisis-en un autre.",
};

export function slugIssueMessage(issue: SlugIssue): string {
  return ISSUE_MESSAGES[issue];
}

function removeAccents(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Fabrique un pseudo à partir d'un nom (ex. nom du studio). */
export function slugify(input: string): string {
  return removeAccents(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-$/, "");
}

/**
 * Nettoyage pendant la frappe : même chose que slugify, mais un tiret à la
 * fin est conservé (sinon on ne pourrait jamais taper "mon-studio" lettre par
 * lettre).
 */
export function normalizeSlugInput(input: string): string {
  return removeAccents(input)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-/, "")
    .slice(0, SLUG_MAX_LENGTH);
}

/** Chemin public de réservation d'un tatoueur. */
export function bookingPath(slug: string): string {
  return `/book/${slug}`;
}

/** Pseudos proposés quand le choix du tatoueur est pris, réservé ou mal formé. */
export function slugSuggestionCandidates(rawBase: string): string[] {
  const base = slugify(rawBase) || "mon-studio";
  const suffixes = ["studio", "tattoo", "ink", "2", "3", "art"];
  const candidates: string[] = [];

  for (const suffix of suffixes) {
    const room = SLUG_MAX_LENGTH - suffix.length - 1;
    const head = base.slice(0, room).replace(/-$/, "");
    const candidate = `${head}-${suffix}`;
    if (candidate !== base && validateSlug(candidate) === null) {
      candidates.push(candidate);
    }
  }

  return [...new Set(candidates)];
}
