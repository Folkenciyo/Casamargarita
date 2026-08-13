import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDimensions } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificado" };

/**
 * Certificado de autenticidad, listo para imprimir o guardar como PDF.
 *
 * Mismo criterio que el dossier: la maqueta la pagina el navegador. Es el
 * gesto que convierte «un cuadro» en «una obra» a ojos de quien la compra, y
 * cuesta una plantilla.
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
          Imprime y elige «Guardar como PDF». Fírmalo a mano antes de
          entregarlo: una firma escaneada en un PDF no certifica nada.
        </p>
      </div>

      <article className="mx-auto max-w-2xl border border-[color:var(--color-canvas-dim)] bg-white p-10 print:border-0 print:p-0">
        <header className="text-center">
          <p className="tabular text-xs tracking-[0.3em] text-[color:var(--color-ink-soft)] uppercase">
            Certificado de autenticidad
          </p>
          <h2 className="display mt-6 text-3xl">{painting.title}</h2>
        </header>

        {cover ? (
          <div className="mt-8 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(cover.basePath, cover.widths[1] ?? 400, "webp")}
              alt={painting.title}
              className="max-h-64 w-auto"
            />
          </div>
        ) : null}

        <p className="mt-10 leading-relaxed">
          Por la presente certifico que la obra titulada{" "}
          <strong>«{painting.title}»</strong>
          {painting.year ? `, realizada en ${painting.year},` : ""} es original,
          única y de mi autoría, ejecutada en {painting.technique.toLowerCase()},
          con unas medidas de{" "}
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

        <div className="mt-16 grid grid-cols-2 gap-10">
          <div>
            <div className="h-16 border-b border-[color:var(--color-ink)]" />
            <p className="mt-2 text-sm">{artist?.name ?? "La artista"}</p>
            <p className="text-xs text-[color:var(--color-ink-soft)]">
              Firma de la autora
            </p>
          </div>
          <div>
            <div className="h-16 border-b border-[color:var(--color-ink)]" />
            <p className="mt-2 text-sm">Lugar y fecha</p>
          </div>
        </div>
      </article>
    </>
  );
}
