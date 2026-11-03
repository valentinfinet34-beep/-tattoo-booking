/**
 * Adresse publique du site, utilisée pour tous les liens envoyés par email et
 * les retours Stripe. On ne lit jamais l'en-tête "Origin" : n'importe quel
 * appelant peut y écrire ce qu'il veut. L'en-tête "Host", lui, ne peut désigner
 * que les domaines réellement rattachés à ce déploiement.
 */
export function getSiteUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = request?.headers.get("host");
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    return `${isLocal ? "http" : "https"}://${host}`;
  }

  return "http://localhost:3000";
}
