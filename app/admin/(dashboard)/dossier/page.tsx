import Link from "next/link";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";
import { STATUS_LABELS } from "@/lib/validation/painting";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dossier" };

/**
 * Dossier del catálogo, listo para imprimir o guardar como PDF desde el
 * navegador.
 *
 * Sin librería de PDF a propósito: el navegador ya sabe paginar, incrustar
 * las fotos y generar el fichero. Una dependencia nueva daría el mismo
 * resultado con más piezas que mantener y una maqueta que hay que rehacer
 * cada vez que cambia la ficha.
 */
export default async function DossierPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; serie?: string }>;
}) {
  const { estado, serie } = await searchParams;

  const paintings = await prisma.painting.findMany({
    where: {
      deletedAt: null,
      ...(estado === "disponibles" ? { status: "AVAILABLE" } : {}),
      ...(serie ? { series: { slug: serie } } : {}),
    },
    orderBy: { position: "asc" },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      series: { select: { title: true } },
    },
  });

  const artist = await prisma.artist.findUnique({ where: { id: "singleton" } });

  return (
    <>
      {/* Toda la interfaz del panel desaparece al imprimir: en el papel solo
          queda el catálogo. */}
      <style>{`
        @media print {
          header, .no-imprimir { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .obra { break-inside: avoid; page-break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-imprimir mb-8">
        <Link href="/admin" className="text-sm underline">
          ← Resumen
        </Link>
        <h1 className="display mt-2 text-2xl">Dossier del catálogo</h1>
        <p className="mt-2 max-w-2xl text-[color:var(--color-ink-soft)]">
          {paintings.length === 1
            ? "1 obra"
            : `${paintings.length} obras`}{" "}
          maquetadas para enviar a una galería o a un cliente. Usa imprimir y
          elige «Guardar como PDF».
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/dossier"
            className={
              estado === "disponibles"
                ? "rounded-full border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm"
                : "rounded-full bg-[color:var(--color-ink)] px-3 py-1 text-sm text-[color:var(--color-canvas)]"
            }
          >
            Todo el catálogo
          </Link>
          <Link
            href="/admin/dossier?estado=disponibles"
            className={
              estado === "disponibles"
                ? "rounded-full bg-[color:var(--color-ink)] px-3 py-1 text-sm text-[color:var(--color-canvas)]"
                : "rounded-full border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm"
            }
          >
            Solo lo disponible
          </Link>
        </div>
      </div>

      <article className="bg-white p-8 print:p-0">
        <header className="mb-10 border-b border-[color:var(--color-canvas-dim)] pb-6">
          <h2 className="display text-3xl">{artist?.name ?? "Catálogo"}</h2>
          {artist?.statement ? (
            <p className="lead mt-2">{artist.statement}</p>
          ) : null}
          <p className="tabular mt-4 text-sm text-[color:var(--color-ink-soft)]">
            {new Intl.DateTimeFormat("es-ES", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
            {artist?.email ? ` · ${artist.email}` : ""}
          </p>
        </header>

        {paintings.length === 0 ? (
          <p className="text-[color:var(--color-ink-soft)]">
            No hay obra que incluir con este filtro.
          </p>
        ) : (
          <div className="grid gap-10">
            {paintings.map((painting) => {
              const cover = painting.images[0];
              return (
                <section
                  key={painting.id}
                  className="obra grid gap-5 sm:grid-cols-[2fr_3fr]"
                >
                  <div>
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imageUrl(cover.basePath, cover.widths[1] ?? 400, "webp")}
                        alt={cover.alt ?? painting.title}
                        className="w-full rounded object-contain"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded bg-[color:var(--color-canvas-dim)]" />
                    )}
                  </div>

                  <div>
                    <h3 className="display text-2xl">
                      {painting.title}
                      {painting.year ? (
                        <span className="text-[color:var(--color-ink-soft)] italic">
                          , {painting.year}
                        </span>
                      ) : null}
                    </h3>

                    <dl className="tabular mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                      <dt className="text-[color:var(--color-ink-soft)]">Técnica</dt>
                      <dd>{painting.technique}</dd>
                      <dt className="text-[color:var(--color-ink-soft)]">Medidas</dt>
                      <dd>
                        {formatDimensions(painting.widthCm, painting.heightCm)}
                      </dd>
                      <dt className="text-[color:var(--color-ink-soft)]">Estado</dt>
                      <dd>{STATUS_LABELS[painting.status]}</dd>
                      <dt className="text-[color:var(--color-ink-soft)]">Precio</dt>
                      <dd>{formatPrice(painting.priceCents, painting.currency)}</dd>
                      {painting.series ? (
                        <>
                          <dt className="text-[color:var(--color-ink-soft)]">
                            Serie
                          </dt>
                          <dd>{painting.series.title}</dd>
                        </>
                      ) : null}
                    </dl>

                    {painting.description ? (
                      <p className="mt-4 text-sm whitespace-pre-line">
                        {painting.description}
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </article>
    </>
  );
}
