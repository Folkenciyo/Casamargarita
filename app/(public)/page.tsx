import Link from "next/link";
import { PaintingCard } from "@/components/public/PaintingCard";
import { PaintingImage } from "@/components/public/PaintingImage";
import { prisma } from "@/lib/db";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [artist, featured] = await Promise.all([
    prisma.artist.findUnique({ where: { id: "singleton" } }),
    prisma.painting.findMany({
      where: { published: true, featured: true },
      orderBy: { position: "asc" },
      take: 7,
      include: { images: { where: { isPrimary: true }, take: 1 } },
    }),
  ]);

  const [hero, ...rest] = featured;
  const heroImage = hero?.images[0];

  return (
    <>
      {/* Portada: la obra manda y el texto se apoya en ella. */}
      <section className="mb-24 grid items-end gap-8 lg:grid-cols-[5fr_4fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <h1 className="display text-[length:var(--text-hero)] text-balance">
            {artist?.statement || "Óleo sobre lienzo."}
          </h1>
          <Link
            href="/galeria"
            className="mt-8 inline-block border-b border-[color:var(--color-oil)] pb-1 text-[color:var(--color-oil)] transition-colors hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
          >
            Ver la galería
          </Link>
        </div>

        {hero && heroImage ? (
          <Link
            href={`/obra/${hero.slug}`}
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
            Obra destacada
          </h2>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((painting) => (
              <PaintingCard key={painting.id} painting={painting} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
