/**
 * Catalogue des zones du corps, des styles de tatouage et des styles
 * d'écriture proposés dans les formulaires.
 *
 * Règles :
 *  - `value` est ce qui est enregistré ; `label` (facultatif) est ce qui est
 *    affiché ; `keywords` aide la recherche (synonymes, termes anglais).
 *  - Les anciennes valeurs (ex. "Bras", "Japonais", "Old school", "Autre")
 *    sont conservées telles quelles : les demandes déjà enregistrées et les
 *    « styles pratiqués » déjà choisis par les tatoueurs restent valides.
 *  - Aucune liste ne peut être complète : chaque liste se termine par
 *    « Autre », qui ouvre un champ libre.
 */

export type CatalogItem = { value: string; label?: string; keywords?: string };
export type CatalogGroup = { label: string; items: CatalogItem[] };

export const OTHER = "Autre";
export const UNSURE = "Je ne sais pas encore";
export const LETTERING = "Lettrage / Écriture";
export const DETAIL_MAX_LENGTH = 80;

export const BODY_LOCATION_GROUPS: CatalogGroup[] = [
  {
    label: "Tête et cou",
    items: [
      { value: "Visage" },
      { value: "Crâne", keywords: "tete cuir chevelu" },
      { value: "Tempe" },
      { value: "Derrière l'oreille" },
      { value: "Oreille", keywords: "lobe helix" },
      { value: "Nuque" },
      { value: "Cou" },
      { value: "Gorge" },
    ],
  },
  {
    label: "Épaules et bras",
    items: [
      { value: "Épaule" },
      { value: "Bras", keywords: "biceps triceps" },
      { value: "Intérieur du bras", keywords: "biceps" },
      { value: "Aisselle" },
      { value: "Coude" },
      { value: "Avant-bras" },
      { value: "Intérieur de l'avant-bras" },
      { value: "Poignet" },
      { value: "Demi-manchette", keywords: "half sleeve" },
      { value: "Manchette complète (bras entier)", keywords: "sleeve bras complet" },
    ],
  },
  {
    label: "Mains",
    items: [
      { value: "Main (dessus)" },
      { value: "Paume" },
      { value: "Doigt", keywords: "phalange bague" },
    ],
  },
  {
    label: "Buste",
    items: [
      { value: "Clavicule" },
      { value: "Poitrine", keywords: "torse" },
      { value: "Pectoral", keywords: "torse" },
      { value: "Sternum", keywords: "entre les seins" },
      { value: "Sous la poitrine", keywords: "underboob" },
      { value: "Côtes", keywords: "cage thoracique" },
      { value: "Flanc", keywords: "cote taille" },
      { value: "Ventre", keywords: "abdomen nombril" },
      { value: "Bas-ventre" },
      { value: "Hanche" },
      { value: "Aine" },
    ],
  },
  {
    label: "Dos",
    items: [
      { value: "Dos" },
      { value: "Haut du dos", keywords: "trapezes" },
      { value: "Omoplate" },
      { value: "Colonne vertébrale", keywords: "spine" },
      { value: "Bas du dos", keywords: "lombaires reins" },
      { value: "Dos complet", keywords: "back piece" },
    ],
  },
  {
    label: "Bassin et jambes",
    items: [
      { value: "Fesse" },
      { value: "Cuisse" },
      { value: "Intérieur de la cuisse" },
      { value: "Genou" },
      { value: "Arrière du genou", keywords: "creux" },
      { value: "Tibia" },
      { value: "Mollet" },
      { value: "Cheville", keywords: "malleole" },
      { value: "Jambe complète", keywords: "leg sleeve" },
    ],
  },
  {
    label: "Pieds",
    items: [
      { value: "Pied (dessus)" },
      { value: "Talon / tendon d'Achille" },
      { value: "Orteil" },
    ],
  },
  {
    label: "Autre",
    items: [
      { value: "Plusieurs zones" },
      { value: UNSURE, keywords: "conseil idee" },
      { value: OTHER, label: "Autre (à préciser)" },
    ],
  },
];

export const STYLE_GROUPS: CatalogGroup[] = [
  {
    label: "Pas encore d'idée",
    items: [{ value: UNSURE, keywords: "conseil idee aucune sais pas" }],
  },
  {
    label: "Réalisme",
    items: [
      { value: "Réalisme", keywords: "realiste photo" },
      { value: "Réalisme noir et gris", keywords: "black and grey realiste" },
      { value: "Réalisme couleur", keywords: "color realism realiste" },
      { value: "Hyperréalisme", keywords: "photo" },
      { value: "Micro-réalisme", keywords: "petit realiste" },
      { value: "Portrait", keywords: "visage personne" },
      { value: "Portrait animalier", keywords: "chien chat animal" },
      { value: "Surréalisme", keywords: "surrealiste" },
      { value: "Trash polka", keywords: "rouge noir" },
      { value: "3D / Trompe-l'œil", keywords: "relief" },
      { value: "Biomécanique", keywords: "biomeca robot" },
      { value: "Bio-organique", keywords: "organique" },
      { value: "Horreur / Dark réalisme", keywords: "horror gore sombre" },
    ],
  },
  {
    label: "Traditionnel",
    items: [
      { value: "Old school", keywords: "traditionnel americain tradi" },
      { value: "Néo-traditionnel", keywords: "neo trad neotrad" },
      { value: "New school", keywords: "cartoon graffiti" },
      { value: "Chicano", keywords: "black and grey payasa" },
      { value: "Pin-up" },
      { value: "Flash du tatoueur", keywords: "catalogue motif pret" },
      { value: "Sticker (effet autocollant)", keywords: "autocollant" },
      { value: "Patch (effet broderie)", keywords: "brode embroidery" },
    ],
  },
  {
    label: "Japonais et Asie",
    items: [
      { value: "Japonais", keywords: "irezumi traditionnel japon carpe koi dragon" },
      { value: "Néo-japonais", keywords: "neo japon" },
      { value: "Manga / Anime", keywords: "japon dessin anime" },
      { value: "Style coréen", keywords: "coree fin colore" },
      { value: "Chinois traditionnel", keywords: "chine" },
      { value: "Thaï (Sak Yant)", keywords: "thailande bambou" },
    ],
  },
  {
    label: "Fin et minimaliste",
    items: [
      { value: "Minimaliste", keywords: "simple discret petit" },
      { value: "Fineline", keywords: "ligne fine fin trait" },
      { value: "Micro-tatouage", keywords: "tiny mini petit" },
      { value: "Single needle", keywords: "aiguille unique fin" },
      { value: "Tracé continu (one line)", keywords: "une ligne" },
      { value: "Handpoke", keywords: "stick and poke fait main sans machine" },
      { value: "Bijou de peau / Ornemental fin", keywords: "bracelet collier chaine" },
      { value: "Petit symbole", keywords: "coeur etoile croix signe" },
    ],
  },
  {
    label: "Noir et graphique",
    items: [
      { value: "Blackwork", keywords: "noir aplat" },
      { value: "Dotwork", keywords: "pointillisme points" },
      { value: "Linework", keywords: "lignes trait" },
      { value: "Géométrique", keywords: "formes triangle" },
      { value: "Géométrie sacrée", keywords: "fleur de vie metatron" },
      { value: "Mandala" },
      { value: "Ornemental", keywords: "ornement baroque" },
      { value: "Gravure / Etching", keywords: "woodcut ancien hachures" },
      { value: "Sketch (croquis)", keywords: "crayonne esquisse" },
      { value: "Abstrait", keywords: "abstract" },
      { value: "Graphique", keywords: "design moderne" },
      { value: "Ignorant style", keywords: "naif" },
      { value: "Blackout", keywords: "aplat noir complet" },
      { value: "Espace négatif", keywords: "negative space" },
      { value: "Silhouette" },
      { value: "Néo-tribal", keywords: "neotribal" },
      { value: "Cybersigilism", keywords: "cyber sigilism cybertribal" },
      { value: "Glitch", keywords: "bug numerique" },
      { value: "Dark art / Gothique", keywords: "sombre occulte" },
    ],
  },
  {
    label: "Tribal et cultures",
    items: [
      { value: "Tribal" },
      { value: "Polynésien", keywords: "tahiti" },
      { value: "Maori", keywords: "ta moko" },
      { value: "Samoan" },
      { value: "Marquisien", keywords: "marquises" },
      { value: "Celtique", keywords: "noeud triskel breton" },
      { value: "Nordique / Viking", keywords: "runes vegvisir" },
      { value: "Berbère / Amazigh", keywords: "kabyle" },
      { value: "Aztèque / Maya", keywords: "mexique" },
      { value: "Amérindien / Haïda", keywords: "totem" },
      { value: "Mehndi (style henné)", keywords: "henne indien" },
      { value: "Égyptien", keywords: "egypte hieroglyphe" },
    ],
  },
  {
    label: "Couleur et peinture",
    items: [
      { value: "Aquarelle", keywords: "watercolor" },
      { value: "Pastel" },
      { value: "Pop art" },
      { value: "Cartoon", keywords: "dessin anime disney" },
      { value: "Kawaii", keywords: "mignon" },
      { value: "Coup de pinceau", keywords: "brushstroke peinture" },
      { value: "Vitrail", keywords: "stained glass" },
      { value: "Abstrait couleur" },
      { value: "Psychédélique", keywords: "trippy" },
      { value: "Pixel art", keywords: "8 bit" },
      { value: "Encre rouge", keywords: "red ink" },
      { value: "Encre blanche", keywords: "white ink" },
      { value: "UV / Blacklight", keywords: "fluo phosphorescent" },
    ],
  },
  {
    label: "Illustration et thèmes",
    items: [
      { value: "Illustratif", keywords: "illustration dessin" },
      { value: "Floral / Botanique", keywords: "fleur plante rose pivoine feuille" },
      { value: "Animalier", keywords: "animal lion loup serpent oiseau papillon" },
      { value: "Fantasy", keywords: "dragon elfe magie" },
      { value: "Religieux / Spirituel", keywords: "croix ange chapelet" },
      { value: "Céleste / Astronomie", keywords: "lune etoile soleil constellation planete" },
      { value: "Signe astrologique", keywords: "zodiaque" },
      { value: "Nautique / Marin", keywords: "ancre bateau vague" },
      { value: "Pop culture / Gaming", keywords: "film serie jeu video" },
      { value: "Hommage / Mémorial", keywords: "souvenir deces" },
      { value: "Tatouage assorti (couple, amis, famille)", keywords: "matching duo" },
      { value: "Empreinte / Ligne de vie", keywords: "patte battement coeur electrocardiogramme" },
    ],
  },
  {
    label: "Lettrage",
    items: [
      {
        value: LETTERING,
        keywords: "texte phrase mot prenom date citation chiffres romains calligraphie lettres police",
      },
    ],
  },
  {
    label: "Recouvrement et retouche",
    items: [
      { value: "Cover-up (recouvrement)", keywords: "recouvrir ancien tatouage cover" },
      { value: "Retouche / Reprise", keywords: "raviver refaire" },
      { value: "Recouvrement de cicatrice", keywords: "vergetures" },
      { value: "Tatouage réparateur", keywords: "medical areole" },
      { value: "Suite d'un projet en cours", keywords: "continuer agrandir" },
    ],
  },
  {
    label: "Autre",
    items: [{ value: OTHER, label: "Autre (à préciser)" }],
  },
];

export const LETTERING_STYLES: CatalogItem[] = [
  { value: UNSURE },
  { value: "Cursive / Script (lettres liées)" },
  { value: "Manuscrite fine" },
  { value: "Mon écriture ou celle d'un proche" },
  { value: "Machine à écrire" },
  { value: "Minimaliste (petites lettres fines)" },
  { value: "Majuscules bâton" },
  { value: "Classique à empattements (type imprimerie)" },
  { value: "Gothique (Old English)" },
  { value: "Chicano lettering" },
  { value: "Calligraphie classique (pleins et déliés)" },
  { value: "Calligraphie arabe" },
  { value: "Calligraphie asiatique (kanji, chinois, coréen)" },
  { value: "Graffiti / Tag" },
  { value: "Chiffres romains" },
  { value: "Chiffres / Date / Coordonnées" },
  { value: "Runes / Alphabet ancien" },
  { value: "Ambigramme" },
  { value: OTHER, label: "Autre (à préciser)" },
];

const flatten = (groups: CatalogGroup[]) =>
  groups.flatMap((group) => group.items.map((item) => item.value));

export const BODY_LOCATIONS: readonly string[] = flatten(BODY_LOCATION_GROUPS);
export const STYLES: readonly string[] = flatten(STYLE_GROUPS);
export const LETTERING_STYLE_VALUES: readonly string[] = LETTERING_STYLES.map(
  (item) => item.value
);

const BODY_LOCATION_SET = new Set(BODY_LOCATIONS);
const STYLE_SET = new Set(STYLES);
const LETTERING_SET = new Set(LETTERING_STYLE_VALUES);

export const isBodyLocation = (value: unknown): value is string =>
  typeof value === "string" && BODY_LOCATION_SET.has(value);
export const isStyle = (value: unknown): value is string =>
  typeof value === "string" && STYLE_SET.has(value);
export const isLetteringStyle = (value: unknown): value is string =>
  typeof value === "string" && LETTERING_SET.has(value);

export function itemLabel(item: CatalogItem): string {
  return item.label ?? item.value;
}

/** Minuscules, sans accents ni ponctuation : « Écriture » et « ecriture » se valent. */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Filtre un catalogue avec ce que la personne a tapé. Chaque mot tapé doit se
 * retrouver dans le nom, les mots-clés ou le nom de la famille.
 */
export function searchCatalog(groups: CatalogGroup[], query: string): CatalogGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return groups;

  return groups
    .map((group) => {
      const groupText = normalizeSearch(group.label);
      return {
        label: group.label,
        items: group.items.filter((item) => {
          const text = `${normalizeSearch(itemLabel(item))} ${normalizeSearch(
            item.keywords ?? ""
          )} ${groupText}`;
          return words.every((word) => text.includes(word));
        }),
      };
    })
    .filter((group) => group.items.length > 0);
}

/**
 * Styles proposés au client d'un tatoueur : ceux que le tatoueur pratique
 * (tous s'il n'a rien choisi), plus « Je ne sais pas encore » et « Autre »
 * pour que personne ne reste bloqué.
 */
export function styleGroupsFor(practicedStyles?: readonly string[] | null): CatalogGroup[] {
  const practiced = (practicedStyles ?? []).filter(isStyle);
  if (practiced.length === 0) return STYLE_GROUPS;

  const allowed = new Set<string>([...practiced, UNSURE, OTHER]);
  return STYLE_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => allowed.has(item.value)),
  })).filter((group) => group.items.length > 0);
}

/**
 * Styles qu’un tatoueur peut cocher comme « pratiqués ». « Je ne sais pas
 * encore » et « Autre » n’y figurent pas : ils sont toujours proposés au client.
 */
export const PRACTICE_STYLE_GROUPS: CatalogGroup[] = STYLE_GROUPS.map((group) => ({
  label: group.label,
  items: group.items.filter((item) => item.value !== UNSURE && item.value !== OTHER),
})).filter((group) => group.items.length > 0);

export const MAX_PRACTICED_STYLES = 60;

/** Garde uniquement des styles du catalogue, sans doublon. */
export function sanitizePracticedStyles(styles: unknown): string[] {
  if (!Array.isArray(styles)) return [];
  const kept = styles.filter(
    (style): style is string => isStyle(style) && style !== UNSURE && style !== OTHER
  );
  return Array.from(new Set(kept)).slice(0, MAX_PRACTICED_STYLES);
}

/** Nettoie un champ libre : une seule ligne, sans espaces en trop. */
export function cleanDetail(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim().slice(0, DETAIL_MAX_LENGTH);
}

/** Ce qui est enregistré pour la zone : « Avant-bras » ou « Avant-bras — côté gauche ». */
export function composeBodyLocation(location: string, detail?: string | null): string {
  const precision = cleanDetail(detail);
  return precision ? `${location} — ${precision}` : location;
}

/**
 * Ce qui est enregistré pour le style :
 *  « Japonais », « Autre — biomécanique végétal »,
 *  « Lettrage / Écriture — Gothique (Old English) ».
 */
export function composeStyle(
  style: string,
  options: { detail?: string | null; letteringStyle?: string | null } = {}
): string {
  const precision = cleanDetail(options.detail);

  if (style === LETTERING) {
    const lettering = options.letteringStyle ?? "";
    if (lettering === OTHER) return precision ? `${style} — ${precision}` : style;
    return isLetteringStyle(lettering) ? `${style} — ${lettering}` : style;
  }

  // La précision libre ne concerne que « Autre » : pour un style de la liste,
  // on ignore un éventuel reste de saisie.
  if (style === OTHER && precision) return `${style} — ${precision}`;
  return style;
}
