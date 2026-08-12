import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/public/InquiryForm";
import { PaintingImage } from "@/components/public/PaintingImage";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";
import { STATUS_LABELS } from "@/lib/validation/painting";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

async function getPainting(slug: string) {
  return prisma.painting.findFirst({
    where: { slug, published: true },
    include: { images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const painting = await getPainting((await params).slug);
  if (!painting) return { title: "Obra no encontrada" };

  const cover = painting.images[0];
  return {
    title: painting.title,
    description:
      painting.description ??
      `${painting.technique}, ${formatDimensions(painting.widthCm, painting.heightCm)}.`,
    openGraph: {
      type: "article",
      title: painting.title,
      images: cover
        ? [imageUrl(cover.basePath, cover.widths.at(-1) ?? 800, "webp")]
        : [],
    },
  };
}

export default async function PaintingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const painting = await getPainting((await params).slug);
  if (!painting) notFound();

  const cover = painting.images[0];
  const forSale = painting.status === "AVAILABLE" || painting.status === "RESERVED";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: painting.title,
    artMedium: painting.technique,
    width: { "@type": "Distance", name: `${painting.widthCm} cm` },
    height: { "@type": "Distance", name: `${painting.heightCm} cm` },
    dateCreated: painting.year ?? undefined,
    description: painting.description ?? undefined,
    offers:
      forSale && painting.priceCents !== null
        ? {
            "@type": "Offer",
            price: (painting.priceCents / 100).toFixed(2),
            priceCurrency: painting.currency,
            availability:
              painting.status === "AVAILABLE"
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <div className="grid gap-4">
          {cover ? (
            <PaintingImage
              basePath={cover.basePath}
              widths={cover.widths}
              width={cover.width}
              height={cover.height}
              blurDataUrl={cover.blurDataUrl}
              alt={cover.alt ?? painting.title}
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="w-full"
            />
          ) : null}

          {painting.images.slice(1).map((image) => (
            <PaintingImage
              key={image.id}
              basePath={image.basePath}
              widths={image.widths}
              width={image.width}
              height={image.height}
              blurDataUrl={image.blurDataUrl}
              alt={image.alt ?? `${painting.title}, detalle`}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="w-full"
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <h1 className="display text-[length:var(--text-title)]">{painting.title}</h1>

          <dl className="tabular mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <dt className="text-[color:var(--color-ink-soft)]">Técnica</dt>
            <dd>{painting.technique}</dd>

            <dt className="text-[color:var(--color-ink-soft)]">Medidas</dt>
            <dd>{formatDimensions(painting.widthCm, painting.heightCm)}</dd>

            {painting.year ? (
              <>
                <dt className="text-[color:var(--color-ink-soft)]">Año</dt>
                <dd>{painting.year}</dd>
              </>
            ) : null}

            <dt className="text-[color:var(--color-ink-soft)]">Estado</dt>
            <dd>{STATUS_LABELS[painting.status]}</dd>

            {forSale ? (
              <>
                <dt className="text-[color:var(--color-ink-soft)]">Precio</dt>
                <dd>{formatPrice(painting.priceCents, painting.currency)}</dd>
              </>
            ) : null}
          </dl>

          {painting.description ? (
            <p className="lead mt-8 whitespace-pre-line">
              {painting.description}
            </p>
          ) : null}

          {forSale ? (
            <section className="mt-10">
              <h2 className="display mb-4 text-2xl">
                ¿Te interesa esta obra?
              </h2>
              <InquiryForm paintingId={painting.id} />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
