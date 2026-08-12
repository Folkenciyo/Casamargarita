import type { Metadata } from "next";
import { PaintingImage } from "@/components/public/PaintingImage";
import { prisma } from "@/lib/db";

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
  const artist = await prisma.artist.findUnique({ where: { id: "singleton" } });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist?.name,
    jobTitle: "Pintora",
    description: artist?.statement || undefined,
    email: artist?.email || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
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
        </article>
      </div>
    </>
  );
}
