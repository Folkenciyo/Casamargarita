import Link from "next/link";
import { PaintingCard } from "@/components/public/PaintingCard";
import { PaintingImage } from "@/components/public/PaintingImage";
import { diccionario, ruta, type Idioma } from "@/lib/i18n/dictionaries";
import { fichaArtista, obraDestacada } from "@/lib/public/queries";
import { ajustesPublicos } from "@/lib/settings";

/** La portada, en el idioma que se le pida. */
export async function HomeView({ lang = "es" }: { lang?: Idioma }) {
  const t = diccionario(lang);
  const { showSoldPaintings } = await ajustesPublicos();
  const [artist, featured] = await Promise.all([
    fichaArtista(),
    obraDestacada(showSoldPaintings),
  ]);

  const [hero, ...rest] = featured;
  const heroImage = hero?.images[0];

  return (
    <>
      {/* Portada: la obra manda y el texto se apoya en ella. */}
      <section className="mb-24 grid items-end gap-8 lg:grid-cols-[5fr_4fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <h1 className="display text-[length:var(--text-hero)] text-balance">
            {/* El lema lo escribe la artista y se queda como lo escribió: es
                su voz, no interfaz. Solo el texto de reserva se traduce. */}
            {artist?.statement || t.portada.lema}
          </h1>
          <Link
            href={ruta(lang, "/galeria")}
            className="mt-8 inline-block border-b border-[color:var(--color-oil)] pb-1 text-[color:var(--color-oil)] transition-colors hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
          >
            {t.portada.verGaleria}
          </Link>
        </div>

        {hero && heroImage ? (
          <Link
            href={ruta(lang, `/obra/${hero.slug}`)}
            className="impasto order-1 block overflow-hidden lg:order-2"
          >
            <PaintingImage
              basePath={heroImage.basePath}
              widths={heroImage.widths}
              width={heroImage.width}
              height={heroImage.height}
              blurDataUrl={heroImage.blurDataUrl}
              alt={heroImage.alt ?? hero.title}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="w-full"
            />
          </Link>
        ) : null}
      </section>

      {rest.length > 0 ? (
        <section>
          <h2 className="display mb-8 text-[length:var(--text-title)]">
            {t.portada.obraDestacada}
          </h2>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((painting) => (
              <PaintingCard key={painting.id} painting={painting} lang={lang} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
