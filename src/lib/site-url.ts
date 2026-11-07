type HeadersSource = { headers: { get(name: string): string | null } };

/**
 * Adresse officielle du site, pour les balises de partage (aperçu Instagram),
 * le sitemap et robots.txt. Une seule source : NEXT_PUBLIC_SITE_URL (à régler
 * sur tattflow.fr à la bascule), sinon le domaine de production du projet
 * Vercel, sinon localhost en développement.
 */
export function getCanonicalSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;

  const vercelDeployment = process.env.VERCEL_URL;
  if (vercelDeployment) return `https://${vercelDeployment}`;

  return "http://localhost:3000";
}

/**
 * Adresse publique du site, utilisée pour tous les liens envoyés par email et
 * les retours Stripe. On ne lit jamais l'en-tête "Origin" : n'importe quel
 * appelant peut y écrire ce qu'il veut. L'en-tête "Host", lui, ne peut désigner
 * que les domaines réellement rattachés à ce déploiement.
 */
export function getSiteUrl(request?: HeadersSource): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = request?.headers.get("host");
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    return `${isLocal ? "http" : "https"}://${host}`;
  }

  return "http://localhost:3000";
}
