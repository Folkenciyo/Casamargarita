import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificadoAcciones } from "@/components/admin/CertificadoAcciones";
import { formatDimensions } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificado" };

/**
 * Certificado de autenticidad, para descargar en PDF o imprimir.
 *
 * El PDF no pasa por el diálogo de impresión del navegador (ver
 * `components/admin/CertificadoAcciones.tsx`): así no le añade su propia
 * cabecera (título de la pestaña, fecha) ni pie (URL, número de página), que
 * no se pueden quitar por CSS. "Imprimir" sí pasa por ahí, para quien
 * prefiera papel directo — se queda con el `@media print` de siempre.
 */
export default async function CertificadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [painting, artist] = await Promise.all([
    prisma.painting.findUnique({
      where: { id },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.artist.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!painting) notFound();

  const cover = painting.images[0];
  const coverUrl = cover
    ? imageUrl(cover.basePath, cover.widths[1] ?? 400, "webp")
    : null;

  return (
    <>
      <style>{`
        @media print {
          header, .no-imprimir { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          body { background: white !important; }
          @page { margin: 2cm; }
        }
      `}</style>

      <div className="no-imprimir mb-8">
        <Link href={`/admin/obras/${painting.id}`} className="text-sm underline">
          ← {painting.title}
        </Link>
        <h1 className="display mt-2 text-2xl">Certificado de autenticidad</h1>
        <p className="mt-2 max-w-2xl text-[color:var(--color-ink-soft)]">
          Descarga el PDF para entregarlo o archivarlo, o imprime
          directamente. Fírmalo a mano antes de entregarlo: una firma
          escaneada en un PDF no certifica nada.
        </p>
        <div className="mt-4">
          <CertificadoAcciones
            painting={{
              title: painting.title,
              year: painting.year,
              technique: painting.technique,
              widthCm: painting.widthCm,
              heightCm: painting.heightCm,
              slug: painting.slug,
            }}
            artistName={artist?.name ?? "La artista"}
            coverUrl={coverUrl}
          />
        </div>
      </div>

      <article className="relative mx-auto max-w-2xl bg-white p-14 print:p-10">
        {/* Orla ornamental: doble filete con un remate en cada esquina.
            Puramente decorativa (aria-hidden): el contenido no depende de
            ella para tener sentido. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] [print-color-adjust:exact]"
        >
          <rect
            x="1"
            y="1"
            width="98"
            height="98"
            fill="none"
            stroke="#8c3f24"
            strokeWidth="0.35"
          />
          <rect
            x="2.6"
            y="2.6"
            width="94.8"
            height="94.8"
            fill="none"
            stroke="#8c3f24"
            strokeWidth="0.12"
          />
          {(
            [
              [1, 1],
              [99, 1],
              [1, 99],
              [99, 99],
            ] satisfies [number, number][]
          ).map(([cx, cy]) => {
            const dx = cx === 1 ? 1 : -1;
            const dy = cy === 1 ? 1 : -1;
            return (
              <path
                key={`${cx}-${cy}`}
                d={`M ${cx} ${cy + dy * 5} L ${cx} ${cy} L ${cx + dx * 5} ${cy}`}
                fill="none"
                stroke="#8c3f24"
                strokeWidth="0.35"
              />
            );
          })}
        </svg>

        <div className="relative">
          <header className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logotipocompletoimg.png"
              alt="Casa Margarita"
              className="mx-auto h-20 w-20 object-contain"
            />
            <p className="tabular mt-6 text-xs tracking-[0.3em] text-[color:var(--color-ink-soft)] uppercase">
              Certificado de autenticidad
            </p>
            <h2 className="display mt-4 text-3xl">{painting.title}</h2>
          </header>

          {coverUrl ? (
            <div className="mt-8 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={painting.title}
                className="max-h-64 w-auto"
              />
            </div>
          ) : null}

          <p className="mt-10 leading-relaxed">
            Por la presente certifico que la obra titulada{" "}
            <strong>«{painting.title}»</strong>
            {painting.year ? `, realizada en ${painting.year},` : ""} es
            original, única y de mi autoría, ejecutada en{" "}
            {painting.technique.toLowerCase()}, con unas medidas de{" "}
            {formatDimensions(painting.widthCm, painting.heightCm)}.
          </p>

          <dl className="tabular mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
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
            <dt className="text-[color:var(--color-ink-soft)]">Referencia</dt>
            <dd>{painting.slug}</dd>
          </dl>

          <div className="mt-16 grid grid-cols-[1fr_auto_1fr] items-end gap-10">
            <div>
              <div className="h-16 border-b border-[color:var(--color-ink)]" />
              <p className="mt-2 text-sm">{artist?.name ?? "La artista"}</p>
              <p className="text-xs text-[color:var(--color-ink-soft)]">
                Firma de la autora
              </p>
            </div>

            {/* El sello: puramente ornamental, refuerza el gesto de la firma
                sin fingir un timbre oficial que esta galería no tiene. */}
            <svg
              aria-hidden
              width="72"
              height="72"
              viewBox="0 0 72 72"
              className="[print-color-adjust:exact]"
            >
              <circle
                cx="36"
                cy="36"
                r="34"
                fill="none"
                stroke="#8c3f24"
                strokeWidth="1"
              />
              <circle
                cx="36"
                cy="36"
                r="28"
                fill="none"
                stroke="#8c3f24"
                strokeWidth="0.5"
              />
              {Array.from({ length: 8 }, (_, i) => {
                const angulo = (i / 8) * Math.PI * 2;
                const x = 36 + Math.cos(angulo) * 14;
                const y = 36 + Math.sin(angulo) * 14;
                return (
                  <circle key={i} cx={x} cy={y} r="2.6" fill="#8c3f24" />
                );
              })}
              <circle cx="36" cy="36" r="4" fill="#8c3f24" />
            </svg>

            <div>
              <div className="h-16 border-b border-[color:var(--color-ink)]" />
              <p className="mt-2 text-sm">Lugar y fecha</p>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
