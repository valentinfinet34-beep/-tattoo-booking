import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
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
  title: "Réservation & Acompte | Studio Tattoo",
  description: "Réservez votre séance de tatouage en quelques clics.",
  manifest: "/manifest.json",
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
    title: "Studio Ink",
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
      <body className="font-sans min-h-full antialiased">{children}</body>
    </html>
  );
}
