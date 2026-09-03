import Link from "next/link";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { diccionario, ruta, type Idioma } from "@/lib/i18n/dictionaries";
import type { STATUS_LABELS } from "@/lib/validation/painting";
import { PaintingImage } from "./PaintingImage";

export type CardPainting = {
  slug: string;
  title: string;
  widthCm: number;
  heightCm: number;
  priceCents: number | null;
  currency: string;
  status: keyof typeof STATUS_LABELS;
  year: number | null;
  images: {
    basePath: string;
    widths: number[];
    width: number;
    height: number;
    blurDataUrl: string;
    alt: string | null;
  }[];
};

export function PaintingCard({
  painting,
  priority = false,
  lang = "es",
}: {
  painting: CardPainting;
  priority?: boolean;
  lang?: Idioma;
}) {
  const cover = painting.images[0];
  const sold = painting.status === "SOLD" || painting.status === "NOT_FOR_SALE";
  const t = diccionario(lang);

  return (
    <article>
      <Link href={ruta(lang, `/obra/${painting.slug}`)} className="group block">
        {/* Nunca se recorta una obra: se muestra entera, a su proporción. Lo
            que se iguala es la altura de la caja, así todas las obras quedan
            alineadas por abajo como colgadas de una misma línea. */}
        <div className="flex h-[clamp(200px,24vw,320px)] items-end justify-start">
          {cover ? (
            <div className="impasto max-h-full">
              <PaintingImage
                basePath={cover.basePath}
                widths={cover.widths}
                width={cover.width}
                height={cover.height}
                blurDataUrl={cover.blurDataUrl}
                alt={cover.alt ?? painting.title}
                priority={priority}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                className="max-h-[clamp(200px,24vw,320px)] w-auto max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-full w-3/4 bg-[color:var(--color-canvas-dim)]" />
          )}
        </div>

        <h3 className="display mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl">
          <span>
            {painting.title}
            {painting.year ? (
              <span className="text-[color:var(--color-ink-soft)] italic">
                , {painting.year}
              </span>
            ) : null}
          </span>
          {painting.status === "SOLD" ? (
            <span className="tabular self-center rounded-full bg-[color:var(--color-oil)] px-2.5 py-0.5 text-[0.6rem] font-sans tracking-[0.15em] text-[color:var(--color-canvas)] uppercase">
              {t.estados.SOLD}
            </span>
          ) : null}
        </h3>

        <p className="tabular mt-1 text-sm text-[color:var(--color-ink-soft)]">
          {formatDimensions(painting.widthCm, painting.heightCm)}
          <span className="mx-2 opacity-40">·</span>
          <span className={sold ? "" : "text-[color:var(--color-ink)]"}>
            {sold
              ? t.estados[painting.status]
              : formatPrice(
                  painting.priceCents,
                  painting.currency,
                  lang === "en" ? "en-GB" : "es-ES",
                  t.precioAConsultar,
                )}
          </span>
        </p>
      </Link>
    </article>
  );
}
