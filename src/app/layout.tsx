import type { Metadata } from "next";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fontDisplay.variable} ${fontSans.variable} h-full`}
    >
      <body className="font-sans min-h-full antialiased">{children}</body>
    </html>
  );
}
