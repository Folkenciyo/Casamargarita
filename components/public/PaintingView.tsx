import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { InquiryForm } from "@/components/public/InquiryForm";
import { PaintingImage } from "@/components/public/PaintingImage";
import { PaintingZoom } from "@/components/public/PaintingZoom";
import { ScaleView } from "@/components/public/ScaleView";
import { ShippingEstimate } from "@/components/public/ShippingEstimate";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { diccionario, type Idioma } from "@/lib/i18n/dictionaries";
import { imageUrl } from "@/lib/images/urls";
import { scriptNonce } from "@/lib/http/nonce";
import { publicPaintingWhere } from "@/lib/settings";
import { contarVisita } from "@/lib/stats";

// `cache` de React: generateMetadata y el propio componente piden la misma
// obra en la misma petición, y sin esto serían dos viajes a Postgres.
export const getPainting = cache(async (slug: string) => {
  return prisma.painting.findFirst({
    // Con las vendidas ocultas, su ficha tampoco existe: quien llegue por un
    // enlace viejo ve un 404, no una obra que ya no está en el catálogo.
    where: { slug, ...(await publicPaintingWhere()) },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      // Solo se enseña la serie si ella misma está publicada: una serie
      // oculta no debe asomar por la ficha de sus obras.
      series: { select: { slug: true, title: true, published: true } },
    },
  });
});

export type PaintingParams = Promise<{ slug: string }>;

/** La ficha de una obra, en el idioma que se le pida. */
export async function PaintingView({
  params,
  lang = "es",
}: {
  params: PaintingParams;
  lang?: Idioma;
}) {
  const t = diccionario(lang);
  const [painting, nonce] = await Promise.all([
    getPainting((await params).slug),
    scriptNonce(),
  ]);
  if (!painting) notFound();

  // Sin await: el contador no puede retrasar la ficha (ver lib/stats.ts).
  contarVisita(painting.id);

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
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <div className="grid gap-4">
          {cover ? (
            <PaintingZoom
              basePath={cover.basePath}
              widths={cover.widths}
              alt={cover.alt ?? painting.title}
            >
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
            </PaintingZoom>
          ) : null}

          {painting.images.slice(1).map((image) => (
            <PaintingZoom
              key={image.id}
              basePath={image.basePath}
              widths={image.widths}
              alt={image.alt ?? `${painting.title}, detalle`}
            >
              <PaintingImage
                basePath={image.basePath}
                widths={image.widths}
                width={image.width}
                height={image.height}
                blurDataUrl={image.blurDataUrl}
                alt={image.alt ?? `${painting.title}, detalle`}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="w-full"
              />
            </PaintingZoom>
          ))}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          {/* La página de serie solo existe en español: es texto de la
              artista, no interfaz, y no se traduce automáticamente. */}
          {painting.series?.published && lang === "es" ? (
            <Link
              href={`/serie/${painting.series.slug}`}
              className="tabular text-xs tracking-[0.2em] text-[color:var(--color-ink-soft)] uppercase underline-offset-4 hover:underline"
            >
              {painting.series.title}
            </Link>
          ) : null}

          <h1 className="display mt-2 text-[length:var(--text-title)]">
            {painting.title}
          </h1>

          <dl className="tabular mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <dt className="text-[color:var(--color-ink-soft)]">{t.obra.tecnica}</dt>
            <dd>{painting.technique}</dd>

            <dt className="text-[color:var(--color-ink-soft)]">{t.obra.medidas}</dt>
            <dd>{formatDimensions(painting.widthCm, painting.heightCm)}</dd>

            {painting.year ? (
              <>
                <dt className="text-[color:var(--color-ink-soft)]">{t.obra.ano}</dt>
                <dd>{painting.year}</dd>
              </>
            ) : null}

            <dt className="text-[color:var(--color-ink-soft)]">{t.obra.estado}</dt>
            <dd>{t.estados[painting.status]}</dd>

            {forSale ? (
              <>
                <dt className="text-[color:var(--color-ink-soft)]">
                  {t.obra.precio}
                </dt>
                <dd>
                  {formatPrice(
                    painting.priceCents,
                    painting.currency,
                    lang === "en" ? "en-GB" : "es-ES",
                    t.precioAConsultar,
                  )}
                </dd>
              </>
            ) : null}
          </dl>

          {painting.description ? (
            <p className="lead mt-8 whitespace-pre-line">
              {painting.description}
            </p>
          ) : null}

          <ScaleView
            anchoCm={painting.widthCm}
            altoCm={painting.heightCm}
            titulo={painting.title}
            lang={lang}
            imagenUrl={
              cover ? imageUrl(cover.basePath, cover.widths[0] ?? 400, "webp") : null
            }
          />

          {forSale ? (
            <>
              <ShippingEstimate
                anchoCm={painting.widthCm}
                altoCm={painting.heightCm}
                lang={lang}
              />
              <section className="mt-10">
                <h2 className="display mb-4 text-2xl">{t.obra.interesa}</h2>
                <InquiryForm paintingId={painting.id} lang={lang} />
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
