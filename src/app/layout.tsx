import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const fontDisplay = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tattflow.vercel.app"),
  title: "Réservation & Acompte | TattFlow",
  description: "Réservez votre séance de tatouage en quelques clics.",
  manifest: "/manifest.json",
  openGraph: {
    title: "TattFlow — Fini les DM Instagram",
    description:
      "Donne à tes clients une vraie page de réservation, avec devis et acompte automatique par Stripe.",
    url: "/",
    siteName: "TattFlow",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattFlow — Fini les DM Instagram",
    description:
      "Donne à tes clients une vraie page de réservation, avec devis et acompte automatique par Stripe.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TattFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#140f0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fontDisplay.variable} ${fontSans.variable} h-full scroll-smooth`}
    >
      <body className="font-sans min-h-full antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
