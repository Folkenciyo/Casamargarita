import Link from "next/link";
import { LanguageSwitch } from "@/components/public/LanguageSwitch";
import { OilTransitions } from "@/components/webgl/OilTransitions";
import { cabeceraPublica } from "@/lib/public/queries";
import { SITE_NAME } from "@/lib/site";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const artist = await cabeceraPublica();
  const name = artist.name || SITE_NAME;
  const hayDiario = artist.hayDiario;

  return (
    <div className="flex min-h-dvh flex-col">
      <OilTransitions />
      <header className="border-b border-[color:var(--color-canvas-dim)]">
        <nav className="mx-auto flex max-w-6xl items-baseline gap-8 px-6 py-8">
          <Link href="/" className="display text-2xl tracking-tight">
            {name}
          </Link>
          <div className="ml-auto flex gap-6 text-sm">
            <Link href="/galeria" className="hover:text-[color:var(--color-oil)]">
              Galería
            </Link>
            {/* El diario solo se anuncia cuando hay algo que leer: un enlace a
                una página vacía resta más de lo que suma. */}
            {hayDiario ? (
              <Link href="/diario" className="hover:text-[color:var(--color-oil)]">
                Diario
              </Link>
            ) : null}
            <Link href="/encargos" className="hover:text-[color:var(--color-oil)]">
              Encargos
            </Link>
            <Link href="/artista" className="hover:text-[color:var(--color-oil)]">
              La artista
            </Link>
            <Link
              href="/buscar"
              aria-label="Buscar"
              className="hover:text-[color:var(--color-oil)]"
            >
              Buscar
            </Link>
            <LanguageSwitch />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-6 pb-24">
        {children}
      </main>

      <footer className="border-t border-[color:var(--color-canvas-dim)]">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-6 py-8 text-sm text-[color:var(--color-ink-soft)]">
          <span>
            © {new Date().getFullYear()} {name}
          </span>
          {artist.email ? (
            <a href={`mailto:${artist.email}`}>{artist.email}</a>
          ) : null}
          {artist.instagram ? (
            <a
              href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {artist.instagram}
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
