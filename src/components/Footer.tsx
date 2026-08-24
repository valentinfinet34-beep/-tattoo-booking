import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-muted md:px-16">
      <p className="mb-2">© {new Date().getFullYear()} TattFlow</p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/mentions-legales" className="hover:text-foreground">
          Mentions légales
        </Link>
        <Link href="/cgu" className="hover:text-foreground">
          CGU
        </Link>
        <Link href="/confidentialite" className="hover:text-foreground">
          Confidentialité
        </Link>
      </div>
    </footer>
  );
}
