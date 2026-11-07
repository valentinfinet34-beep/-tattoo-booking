import { afterEach, describe, expect, it, vi } from "vitest";
import { getCanonicalSiteUrl, getSiteUrl } from "@/lib/site-url";

const request = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

afterEach(() => {
  vi.unstubAllEnvs();
});

function clearSiteEnv() {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_URL", "");
}

describe("getSiteUrl : adresse des liens d'emails et des retours Stripe", () => {
  it("ignore totalement l'en-tête Origin, même falsifié", () => {
    clearSiteEnv();
    expect(
      getSiteUrl(request({ host: "tattoo-booking-tau.vercel.app", origin: "https://evil.example" }))
    ).toBe("https://tattoo-booking-tau.vercel.app");
  });

  it("avec NEXT_PUBLIC_SITE_URL, c'est toujours cette valeur (sans « / » final), quoi que dise la requête", () => {
    clearSiteEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tattflow.fr/");
    expect(getSiteUrl(request({ host: "evil.example", origin: "https://evil.example" }))).toBe(
      "https://tattflow.fr"
    );
  });

  it("en local, http ; hors requête, repli sur localhost", () => {
    clearSiteEnv();
    expect(getSiteUrl(request({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("getCanonicalSiteUrl : balises de partage, sitemap, robots.txt", () => {
  it("NEXT_PUBLIC_SITE_URL est prioritaire", () => {
    clearSiteEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tattflow.fr/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tattoo-booking-tau.vercel.app");
    expect(getCanonicalSiteUrl()).toBe("https://tattflow.fr");
  });

  it("sinon le domaine de production du projet Vercel", () => {
    clearSiteEnv();
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tattoo-booking-tau.vercel.app");
    vi.stubEnv("VERCEL_URL", "tattoo-booking-abc123.vercel.app");
    expect(getCanonicalSiteUrl()).toBe("https://tattoo-booking-tau.vercel.app");
  });

  it("sinon l'adresse du déploiement, puis localhost en développement", () => {
    clearSiteEnv();
    vi.stubEnv("VERCEL_URL", "tattoo-booking-abc123.vercel.app");
    expect(getCanonicalSiteUrl()).toBe("https://tattoo-booking-abc123.vercel.app");

    clearSiteEnv();
    expect(getCanonicalSiteUrl()).toBe("http://localhost:3000");
  });

  it("l'ancienne adresse écrite en dur a disparu du code", async () => {
    const { readFileSync } = await import("node:fs");
    for (const file of [
      "src/app/layout.tsx",
      "src/app/sitemap.ts",
      "src/app/robots.ts",
      "src/components/demo/DemoProjectCard.tsx",
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toContain("tattflow.vercel.app");
    }
  });
});
