import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PaintingImage } from "@/components/public/PaintingImage";
import { prisma } from "@/lib/db";
import { scriptNonce } from "@/lib/http/nonce";
import { imageUrl } from "@/lib/images/urls";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

const getEntrada = cache(async (slug: string) => {
  return prisma.journalEntry.findFirst({
    where: { slug, published: true },
    include: {
      images: { orderBy: { position: "asc" } },
      painting: {
        select: { slug: true, title: true, published: true, deletedAt: true },
      },
    },
  });
});

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const entrada = await getEntrada((await params).slug);
  if (!entrada) return { title: "Entrada no encontrada" };

  const portada = entrada.images[0];
  return {
    title: entrada.title,
    description: entrada.summary || undefined,
    openGraph: {
      type: "article",
      title: entrada.title,
      description: entrada.summary || undefined,
      publishedTime: entrada.publishedAt.toISOString(),
      images: portada
        ? [imageUrl(portada.basePath, portada.widths.at(-2) ?? 800, "webp")]
        : [],
    },
  };
}

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [entrada, nonce] = await Promise.all([
    getEntrada((await params).slug),
    scriptNonce(),
  ]);
  if (!entrada) notFound();

  const obraVisible =
    entrada.painting?.published && !entrada.painting.deletedAt
      ? entrada.painting
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entrada.title,
    description: entrada.summary || undefined,
    datePublished: entrada.publishedAt.toISOString(),
    dateModified: entrada.updatedAt.toISOString(),
    author: { "@type": "Person", name: SITE_NAME },
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-2xl">
        <header className="mb-10">
          <p className="tabular text-xs tracking-[0.2em] text-[color:var(--color-ink-soft)] uppercase">
            {formatoFecha.format(entrada.publishedAt)}
          </p>
          <h1 className="display mt-3 text-[length:var(--text-title)] text-balance">
            {entrada.title}
          </h1>
          {entrada.summary ? (
            <p className="lead mt-4">{entrada.summary}</p>
          ) : null}
        </header>

        {entrada.body ? (
          <div className="max-w-prose whitespace-pre-line">{entrada.body}</div>
        ) : null}

        {/* Las fotos van al final, en orden: son las etapas del proceso y se
            leen como una secuencia, cada una con su pie. */}
        {entrada.images.length > 0 ? (
          <div className="mt-12 grid gap-10">
            {entrada.images.map((imagen) => (
              <figure key={imagen.id}>
                <div className="impasto">
                  <PaintingImage
                    basePath={imagen.basePath}
                    widths={imagen.widths}
                    width={imagen.width}
                    height={imagen.height}
                    blurDataUrl={imagen.blurDataUrl}
                    alt={imagen.alt ?? imagen.caption ?? entrada.title}
                    sizes="(max-width: 768px) 90vw, 42rem"
                    className="w-full"
                  />
                </div>
                {imagen.caption ? (
                  <figcaption className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
                    {imagen.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}

        {obraVisible ? (
          <p className="mt-14 rounded border border-[color:var(--color-canvas-dim)] p-5">
            Esta entrada habla de{" "}
            <Link href={`/obra/${obraVisible.slug}`} className="underline">
              {obraVisible.title}
            </Link>
            , que está en la galería.
          </p>
        ) : null}

        <p className="mt-12">
          <Link href="/diario" className="text-sm underline">
            ← Todas las entradas
          </Link>
        </p>
      </article>
    </>
  );
}
