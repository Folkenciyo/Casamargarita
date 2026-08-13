import Link from "next/link";
import {
  ExhibitionMode,
  type ObraExpuesta,
} from "@/components/public/ExhibitionMode";
import { PaintingCard } from "@/components/public/PaintingCard";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { FORMATOS } from "@/lib/formats";
import { diccionario, ruta, type Idioma } from "@/lib/i18n/dictionaries";
import {
  galeriaHref,
  hayFiltros,
  parseFiltrosGaleria,
} from "@/lib/public/gallery-filters";
import { paginaGaleria, seriesPublicadas } from "@/lib/public/queries";
import { ajustesPublicos } from "@/lib/settings";
import { STATUS_LABELS } from "@/lib/validation/painting";

// Múltiplo de 2 y 3: la última fila queda completa tanto en dos columnas
// (móvil/tablet) como en tres (escritorio).
const PAGE_SIZE = 24;

export type GalleryParams = Promise<{
  formato?: string;
  serie?: string;
  disponibles?: string;
  page?: string;
}>;

/**
 * La galería, en el idioma que se le pida.
 *
 * Vive en `components/` y no en `app/` porque Next no deja que una página
 * reciba props propias: las dos rutas —`/galeria` y `/en/galeria`— son
 * envoltorios de tres líneas sobre este componente, y así los filtros y la
 * consulta existen una sola vez.
 */
export async function GalleryView({
  searchParams,
  lang = "es",
}: {
  searchParams: GalleryParams;
  lang?: Idioma;
}) {
  const t = diccionario(lang);
  const filtros = parseFiltrosGaleria(await searchParams);
  const enlace = (cambios: Partial<typeof filtros>) =>
    galeriaHref(filtros, cambios, lang);

  const [{ showSoldPaintings }, series] = await Promise.all([
    ajustesPublicos(),
    seriesPublicadas(),
  ]);

  const serieActiva = series.find((serie) => serie.slug === filtros.serie) ?? null;

  const { total, obras: paintings } = await paginaGaleria(
    showSoldPaintings,
    filtros,
    serieActiva?.id ?? null,
    PAGE_SIZE,
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtrada = hayFiltros(filtros);

  // El modo exposición recorre lo que hay en esta página, no el catálogo
  // entero: pasar de obra no debería disparar consultas ni descargas de una
  // página que el visitante no ha pedido.
  const expuestas: ObraExpuesta[] = paintings.map((painting) => {
    const cover = painting.images[0];
    const vendida =
      painting.status === "SOLD" || painting.status === "NOT_FOR_SALE";

    return {
      slug: painting.slug,
      title: painting.title,
      year: painting.year,
      medidas: formatDimensions(painting.widthCm, painting.heightCm),
      etiqueta: vendida
        ? STATUS_LABELS[painting.status]
        : formatPrice(painting.priceCents, painting.currency),
      imagen: cover
        ? {
            basePath: cover.basePath,
            widths: cover.widths,
            alt: cover.alt ?? painting.title,
          }
        : null,
    };
  });

  const pastilla = (activo: boolean) =>
    activo
      ? "rounded-full bg-[color:var(--color-ink)] px-3 py-1 text-sm text-[color:var(--color-canvas)]"
      : "rounded-full border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm transition-colors hover:border-[color:var(--color-oil)]";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-[length:var(--text-title)]">
          {serieActiva ? serieActiva.title : t.galeria.titulo}
        </h1>
        <div className="flex items-baseline gap-6">
          {/* A diferencia de la sala, el modo exposición no pide GPU: vale
              igual en un móvil, así que no se esconde en pantalla pequeña. */}
          <ExhibitionMode obras={expuestas} etiqueta={t.galeria.modoExposicion} />
          {/* Solo tiene sentido en pantalla grande; la propia sala lo verifica. */}
          <Link
            href={ruta(lang, "/galeria/sala")}
            className="hidden text-sm underline lg:block"
          >
            {t.galeria.verComoSala}
          </Link>
        </div>
      </div>

      {/* Filtros como enlaces y no como formulario: cada combinación tiene su
          propia dirección, se puede compartir y funciona sin JavaScript. */}
      <nav aria-label="Filtros" className="mb-10 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-[color:var(--color-ink-soft)]">
            {t.galeria.tamano}
          </span>
          <Link
            href={enlace({ formato: null, pagina: 1 })}
            className={pastilla(filtros.formato === null)}
          >
            {t.galeria.cualquiera}
          </Link>
          {FORMATOS.map((formato) => (
            <Link
              key={formato}
              href={enlace({ formato, pagina: 1 })}
              className={pastilla(filtros.formato === formato)}
            >
              {t.formatos[formato]}
            </Link>
          ))}
        </div>

        {series.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-[color:var(--color-ink-soft)]">
              {t.galeria.serie}
            </span>
            <Link
              href={enlace({ serie: null, pagina: 1 })}
              className={pastilla(filtros.serie === null)}
            >
              {t.galeria.todas}
            </Link>
            {series.map((serie) => (
              <Link
                key={serie.id}
                href={enlace({ serie: serie.slug, pagina: 1 })}
                className={pastilla(filtros.serie === serie.slug)}
              >
                {serie.title}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={enlace({
              soloDisponibles: !filtros.soloDisponibles,
              pagina: 1,
            })}
            className={pastilla(filtros.soloDisponibles)}
          >
            {t.galeria.soloDisponibles}
          </Link>
          {filtrada ? (
            <Link
              href={ruta(lang, "/galeria")}
              className="text-sm underline"
            >
              {t.galeria.quitarFiltros}
            </Link>
          ) : null}
          <span className="tabular ml-auto text-sm text-[color:var(--color-ink-soft)]">
            {total === 1 ? `1 ${t.galeria.obra}` : `${total} ${t.galeria.obras}`}
          </span>
        </div>
      </nav>

      {serieActiva && lang === "es" ? (
        <p className="mb-10 -mt-4">
          <Link href={`/serie/${serieActiva.slug}`} className="text-sm underline">
            Leer sobre esta serie →
          </Link>
        </p>
      ) : null}

      {paintings.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          {filtrada ? (
            <>
              {t.galeria.sinCoincidencias}{" "}
              <Link href={ruta(lang, "/galeria")} className="underline">
                {t.galeria.verCatalogoCompleto}
              </Link>
              .
            </>
          ) : (
            t.galeria.sinObra
          )}
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {paintings.map((painting, index) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              priority={index < 3}
              lang={lang}
            />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Paginación"
          className="mt-14 flex items-center justify-between gap-4"
        >
          {filtros.pagina > 1 ? (
            <Link
              href={enlace({ pagina: filtros.pagina - 1 })}
              className="text-sm underline"
            >
              {t.galeria.anterior}
            </Link>
          ) : (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              {t.galeria.anterior}
            </span>
          )}
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            {t.galeria.pagina} {filtros.pagina} {t.galeria.de} {pageCount}
          </span>
          {filtros.pagina < pageCount ? (
            <Link
              href={enlace({ pagina: filtros.pagina + 1 })}
              className="text-sm underline"
            >
              {t.galeria.siguiente}
            </Link>
          ) : (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              {t.galeria.siguiente}
            </span>
          )}
        </nav>
      ) : null}
    </>
  );
}
