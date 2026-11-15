import { describe, expect, it } from "vitest";
import {
  BODY_LOCATIONS,
  BODY_LOCATION_GROUPS,
  DETAIL_MAX_LENGTH,
  LETTERING,
  LETTERING_STYLE_VALUES,
  OTHER,
  PRACTICE_STYLE_GROUPS,
  STYLES,
  STYLE_GROUPS,
  UNSURE,
  cleanDetail,
  composeBodyLocation,
  composeStyle,
  sanitizePracticedStyles,
  searchCatalog,
  styleGroupsFor,
} from "@/lib/tattoo-catalog";
import { tattooRequestSchema } from "@/lib/validations/tattooRequest.schema";
import { computeTarget } from "@/lib/image-resize";
import { trustedStorageUrl } from "@/lib/storage-url";

const values = (groups: { items: { value: string }[] }[]) =>
  groups.flatMap((group) => group.items.map((item) => item.value));

describe("catalogue des zones du corps et des styles", () => {
  it("aucun doublon dans chaque liste", () => {
    for (const list of [BODY_LOCATIONS, STYLES, LETTERING_STYLE_VALUES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("les anciennes valeurs restent valides (demandes et styles pratiqués déjà enregistrés)", () => {
    for (const legacy of ["Bras", "Avant-bras", "Cheville", "Dos", "Cou", "Poitrine", "Cuisse", "Mollet", "Doigt", "Autre"]) {
      expect(BODY_LOCATIONS, legacy).toContain(legacy);
    }
    for (const legacy of ["Réalisme", "Japonais", "Old school", "Minimaliste", "Géométrique", "Tribal", "Autre"]) {
      expect(STYLES, legacy).toContain(legacy);
    }
  });

  it("les listes sont larges et se terminent toutes par une sortie « Autre »", () => {
    expect(BODY_LOCATIONS.length).toBeGreaterThanOrEqual(45);
    expect(STYLES.length).toBeGreaterThanOrEqual(90);
    expect(LETTERING_STYLE_VALUES.length).toBeGreaterThanOrEqual(15);
    expect(BODY_LOCATIONS.at(-1)).toBe(OTHER);
    expect(STYLES.at(-1)).toBe(OTHER);
    expect(LETTERING_STYLE_VALUES.at(-1)).toBe(OTHER);
    expect(STYLES).toContain(UNSURE);
    expect(STYLES).toContain(LETTERING);
  });

  it("aucune valeur ne contient le séparateur « — » ni ne dépasse 60 caractères", () => {
    for (const value of [...BODY_LOCATIONS, ...STYLES, ...LETTERING_STYLE_VALUES]) {
      expect(value, value).not.toContain("—");
      expect(value.length, value).toBeLessThanOrEqual(60);
      expect(value, value).toBe(value.trim());
    }
  });

  it("les styles à cocher par le tatoueur n'incluent ni « Autre » ni « Je ne sais pas encore »", () => {
    const practice = values(PRACTICE_STYLE_GROUPS);
    expect(practice).not.toContain(OTHER);
    expect(practice).not.toContain(UNSURE);
    expect(practice.length).toBe(STYLES.length - 2);
  });
});

describe("recherche dans le catalogue", () => {
  const find = (groups: typeof STYLE_GROUPS, query: string) => values(searchCatalog(groups, query));

  it("ignore les accents et les majuscules", () => {
    expect(find(STYLE_GROUPS, "ecriture")).toContain(LETTERING);
    expect(find(STYLE_GROUPS, "ÉCRITURE")).toContain(LETTERING);
    expect(find(BODY_LOCATION_GROUPS, "POIGNET")).toEqual(["Poignet"]);
    expect(find(BODY_LOCATION_GROUPS, "epaule")).toContain("Épaule");
  });

  it("trouve par synonyme ou terme anglais", () => {
    expect(find(STYLE_GROUPS, "pointillisme")).toContain("Dotwork");
    expect(find(STYLE_GROUPS, "watercolor")).toEqual(["Aquarelle"]);
    expect(find(STYLE_GROUPS, "prenom")).toContain(LETTERING);
    expect(find(STYLE_GROUPS, "recouvrir")).toContain("Cover-up (recouvrement)");
    expect(find(BODY_LOCATION_GROUPS, "sleeve")).toContain("Manchette complète (bras entier)");
  });

  it("tous les mots tapés doivent correspondre", () => {
    expect(find(STYLE_GROUPS, "noir gris")).toContain("Réalisme noir et gris");
    expect(find(STYLE_GROUPS, "noir gris")).not.toContain("Aquarelle");
  });

  it("une recherche vide rend tout, une recherche sans résultat ne rend rien", () => {
    expect(find(STYLE_GROUPS, "   ")).toEqual([...STYLES]);
    expect(find(STYLE_GROUPS, "xyzzy")).toEqual([]);
  });
});

describe("styles proposés au client d'un tatoueur", () => {
  it("tatoueur sans sélection : tous les styles", () => {
    expect(values(styleGroupsFor([]))).toEqual([...STYLES]);
    expect(values(styleGroupsFor(null))).toEqual([...STYLES]);
  });

  it("tatoueur avec sélection : ses styles, plus « Je ne sais pas encore » et « Autre »", () => {
    expect(values(styleGroupsFor(["Dotwork", "Japonais", "style-inconnu"]))).toEqual([
      UNSURE,
      "Japonais",
      "Dotwork",
      OTHER,
    ]);
  });

  it("une sélection qui ne contient que des valeurs inconnues revient à tous les styles", () => {
    expect(values(styleGroupsFor(["n'existe pas"]))).toEqual([...STYLES]);
  });

  it("la liste enregistrée par le tatoueur est nettoyée", () => {
    expect(
      sanitizePracticedStyles(["Dotwork", "Dotwork", "<script>", 42, OTHER, UNSURE, "Japonais"])
    ).toEqual(["Dotwork", "Japonais"]);
    expect(sanitizePracticedStyles("Dotwork")).toEqual([]);
  });
});

describe("texte enregistré pour la zone et le style", () => {
  it("zone : avec ou sans précision", () => {
    expect(composeBodyLocation("Avant-bras")).toBe("Avant-bras");
    expect(composeBodyLocation("Avant-bras", "  côté   gauche \n")).toBe("Avant-bras — côté gauche");
    expect(composeBodyLocation(OTHER, "derrière le genou")).toBe("Autre — derrière le genou");
  });

  it("style : la précision ne compte que pour « Autre »", () => {
    expect(composeStyle("Japonais")).toBe("Japonais");
    expect(composeStyle("Japonais", { detail: "reste d'une ancienne saisie" })).toBe("Japonais");
    expect(composeStyle(OTHER, { detail: "gravure et aquarelle" })).toBe("Autre — gravure et aquarelle");
  });

  it("lettrage : le style d'écriture est ajouté", () => {
    expect(composeStyle(LETTERING, { letteringStyle: "Gothique (Old English)" })).toBe(
      "Lettrage / Écriture — Gothique (Old English)"
    );
    expect(composeStyle(LETTERING, { letteringStyle: OTHER, detail: "comme ma grand-mère" })).toBe(
      "Lettrage / Écriture — comme ma grand-mère"
    );
    expect(composeStyle(LETTERING, { letteringStyle: "police inventée" })).toBe(LETTERING);
  });

  it("un champ libre est ramené à une ligne et coupé à la longueur maximale", () => {
    expect(cleanDetail("  a \n\n b\tc  ")).toBe("a b c");
    expect(cleanDetail("x".repeat(500))).toHaveLength(DETAIL_MAX_LENGTH);
    expect(cleanDetail(null)).toBe("");
  });
});

describe("validation de la demande du client", () => {
  const base = {
    firstName: "Nouveau",
    lastName: "Client",
    email: "nouveau@client.test",
    phone: "0600000000",
    description: "Une description assez longue",
    bodyLocation: "Poignet",
    sizeCategory: "Petit (< 5 cm)",
    style: "Fineline",
    colorMode: "Noir et gris",
    preferredDate: "2099-01-06",
    preferredTime: "10:00",
    images: [],
  };
  const check = (extra: Record<string, unknown>) => tattooRequestSchema.safeParse({ ...base, ...extra });
  const errorFields = (extra: Record<string, unknown>) => {
    const result = check(extra);
    return result.success ? [] : Object.keys(result.error.flatten().fieldErrors);
  };

  it("une demande simple passe, sans aucun des nouveaux champs", () => {
    expect(check({}).success).toBe(true);
  });

  it("zone ou style vide, ou hors catalogue : refusé", () => {
    expect(errorFields({ bodyLocation: "" })).toEqual(["bodyLocation"]);
    expect(errorFields({ style: "" })).toEqual(["style"]);
    expect(errorFields({ bodyLocation: "<script>alert(1)</script>" })).toEqual(["bodyLocation"]);
    expect(errorFields({ style: "Style inventé" })).toEqual(["style"]);
  });

  it("zone « Autre » : la précision est obligatoire", () => {
    expect(errorFields({ bodyLocation: OTHER })).toEqual(["bodyLocationDetail"]);
    expect(errorFields({ bodyLocation: OTHER, bodyLocationDetail: "   " })).toEqual(["bodyLocationDetail"]);
    expect(check({ bodyLocation: OTHER, bodyLocationDetail: "derrière le genou" }).success).toBe(true);
  });

  it("style « Autre » : la précision est obligatoire", () => {
    expect(errorFields({ style: OTHER })).toEqual(["styleDetail"]);
    expect(check({ style: OTHER, styleDetail: "gravure et aquarelle" }).success).toBe(true);
  });

  it("lettrage : le style d'écriture est obligatoire et doit venir de la liste", () => {
    expect(errorFields({ style: LETTERING })).toEqual(["letteringStyle"]);
    expect(errorFields({ style: LETTERING, letteringStyle: "" })).toEqual(["letteringStyle"]);
    expect(errorFields({ style: LETTERING, letteringStyle: "police inventée" })).toEqual(["letteringStyle"]);
    expect(check({ style: LETTERING, letteringStyle: "Machine à écrire" }).success).toBe(true);
  });

  it("lettrage « Autre » : il faut décrire l'écriture voulue", () => {
    expect(errorFields({ style: LETTERING, letteringStyle: OTHER })).toEqual(["styleDetail"]);
    expect(check({ style: LETTERING, letteringStyle: OTHER, styleDetail: "comme ma grand-mère" }).success).toBe(true);
  });

  it("une précision trop longue est refusée", () => {
    expect(errorFields({ bodyLocationDetail: "x".repeat(DETAIL_MAX_LENGTH + 1) })).toEqual(["bodyLocationDetail"]);
    expect(errorFields({ style: OTHER, styleDetail: "x".repeat(DETAIL_MAX_LENGTH + 1) })).toEqual(["styleDetail"]);
  });
});

describe("réduction des photos : calcul des dimensions", () => {
  it("photo de profil : carré centré, jamais plus grand que demandé", () => {
    expect(computeTarget(4000, 3000, { maxSide: 512, square: true })).toEqual({
      sx: 500, sy: 0, sw: 3000, sh: 3000, width: 512, height: 512,
    });
    expect(computeTarget(3000, 4000, { maxSide: 512, square: true })).toEqual({
      sx: 0, sy: 500, sw: 3000, sh: 3000, width: 512, height: 512,
    });
  });

  it("une petite image n'est pas agrandie", () => {
    expect(computeTarget(200, 300, { maxSide: 512, square: true })).toMatchObject({ width: 200, height: 200 });
    expect(computeTarget(800, 600, { maxSide: 1600 })).toMatchObject({ width: 800, height: 600 });
  });

  it("une grande photo garde ses proportions", () => {
    expect(computeTarget(4000, 3000, { maxSide: 1600 })).toEqual({
      sx: 0, sy: 0, sw: 4000, sh: 3000, width: 1600, height: 1200,
    });
  });
});

describe("adresses d'images de confiance", () => {
  it("n'accepte que le stockage public du projet", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co/";
    try {
      const good = "https://projet.supabase.co/storage/v1/object/public/avatars/u/avatar-1.jpg";
      expect(trustedStorageUrl(good)).toBe(good);
      expect(trustedStorageUrl("https://evil.example/pixel.gif")).toBeNull();
      expect(trustedStorageUrl("https://projet.supabase.co.evil.example/storage/v1/object/public/a.jpg")).toBeNull();
      expect(trustedStorageUrl("javascript:alert(1)")).toBeNull();
      expect(trustedStorageUrl(null)).toBeNull();
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });
});
