/**
 * Ne garde une adresse d'image que si elle pointe vers NOTRE stockage public
 * Supabase. L'adresse d'une photo de profil est modifiable par le tatoueur :
 * sans ce filtre, une adresse externe pourrait servir de pixel de suivi, ou
 * faire planter une page qui affiche l'image avec le composant optimisé de
 * Next (qui refuse les sites non autorisés).
 */
export function trustedStorageUrl(url: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!url || !base) return null;
  return url.startsWith(`${base}/storage/v1/object/public/`) ? url : null;
}
