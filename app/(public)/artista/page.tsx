import type { Metadata } from "next";
import { PaintingImage } from "@/components/public/PaintingImage";
import { prisma } from "@/lib/db";
import { scriptNonce } from "@/lib/http/nonce";
import { agruparPorTipo } from "@/lib/milestones";
import { publicPaintingWhere } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const artist = await prisma.artist.findUnique({ where: { id: "singleton" } });
  return {
    title: "La artista",
    description: artist?.statement || undefined,
  };
}

export default async function ArtistPage() {
  const [artist, hitos, obras, nonce] = await Promise.all([
    prisma.artist.findUnique({ where: { id: "singleton" } }),
    prisma.milestone.findMany({
      where: { published: true },
      orderBy: [{ year: "desc" }, { position: "desc" }],
    }),
    // Las obras visibles, para enlazarlas desde los datos estructurados: así
    // el buscador sabe que estos cuadros son de esta persona.
    prisma.painting.findMany({
      where: await publicPaintingWhere(),
      orderBy: { position: "asc" },
      take: 25,
      select: { slug: true, title: true },
    }),
    scriptNonce(),
  ]);

  const grupos = agruparPorTipo(hitos);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist?.name,
    jobTitle: "Pintora",
    description: artist?.statement || undefined,
    email: artist?.email || undefined,
    url: `${SITE_URL}/artista`,
    sameAs: artist?.instagram
      ? [`https://instagram.com/${artist.instagram.replace("@", "")}`]
      : undefined,
    award: hitos
      .filter((hito) => hito.kind === "AWARD")
      .map((hito) => `${hito.title} (${hito.year})`),
    // La obra, enlazada: es lo que convierte una ficha suelta en el autor de
    // un catálogo a ojos de un buscador.
    makesOffer: undefined,
    workExample: obras.map((obra) => ({
      "@type": "VisualArtwork",
      name: obra.title,
      url: `${SITE_URL}/obra/${obra.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
        {artist?.portraitPath ? (
          <div className="impasto max-w-xs overflow-hidden rounded lg:max-w-none">
            <PaintingImage
              basePath={artist.portraitPath}
              widths={artist.portraitWidths}
              width={artist.portraitWidth ?? 400}
              height={artist.portraitHeight ?? 400}
              blurDataUrl={artist.portraitBlurDataUrl ?? ""}
              alt={artist.name}
              priority
              sizes="(max-width: 1024px) 60vw, 30vw"
              className="w-full"
            />
          </div>
        ) : null}

        <article className="max-w-2xl">
          <h1 className="display text-[length:var(--text-title)]">
            {artist?.name ?? "La artista"}
          </h1>

          {artist?.statement ? (
            <p className="lead mt-6">
              {artist.statement}
            </p>
          ) : null}

          {artist?.bio ? (
            <div className="mt-10 max-w-prose whitespace-pre-line">
              {artist.bio}
            </div>
          ) : null}

          {artist?.email ? (
            <p className="mt-8">
              <a
                href={`mailto:${artist.email}`}
                className="border-b border-[color:var(--color-oil)] text-[color:var(--color-oil)]"
              >
                {artist.email}
              </a>
            </p>
          ) : null}

          {grupos.length > 0 ? (
            <div className="mt-14 grid gap-10">
              {grupos.map((grupo) => (
                <section key={grupo.kind}>
                  <h2 className="tabular mb-4 text-xs tracking-[0.2em] text-[color:var(--color-ink-soft)] uppercase">
                    {grupo.etiqueta}
                  </h2>
                  <ul className="grid gap-3">
                    {grupo.hitos.map((hito) => (
                      <li
                        key={hito.id}
                        className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 border-b border-[color:var(--color-canvas-dim)] pb-3"
                      >
                        <span className="tabular text-sm text-[color:var(--color-ink-soft)]">
                          {hito.year}
                        </span>
                        <div>
                          {hito.url ? (
                            <a
                              href={hito.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline-offset-4 hover:underline"
                            >
                              {hito.title}
                            </a>
                          ) : (
                            <span>{hito.title}</span>
                          )}
                          {hito.place ? (
                            <span className="block text-sm text-[color:var(--color-ink-soft)]">
                              {hito.place}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </>
  );
}
