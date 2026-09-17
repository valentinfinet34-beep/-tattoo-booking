import type { MetadataRoute } from "next";

const BASE_URL = "https://tattflow.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, priority: 1 },
    { url: `${BASE_URL}/signup`, priority: 0.8 },
    { url: `${BASE_URL}/demo`, priority: 0.5 },
    { url: `${BASE_URL}/cgu`, priority: 0.2 },
    { url: `${BASE_URL}/mentions-legales`, priority: 0.2 },
    { url: `${BASE_URL}/confidentialite`, priority: 0.2 },
  ];
}
