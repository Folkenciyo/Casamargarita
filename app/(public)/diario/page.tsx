import type { Metadata } from "next";
import Link from "next/link";
import { PaintingImage } from "@/components/public/PaintingImage";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diario de taller",
  description:
    "Cómo se hace un óleo, contado por etapas: la mancha, las veladuras, el empaste, el barniz.",
};

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function JournalPage() {
  const entradas = await prisma.journalEntry.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      painting: { select: { slug: true, title: true, published: true } },
    },
  });

  return (
    <>
      <header className="mb-14 max-w-2xl">
        <h1 className="display text-[length:var(--text-title)]">
          Diario de taller
        </h1>
        <p className="lead mt-4">
          Lo que pasa entre el lienzo en blanco y el cuadro colgado. Sin prisa y
          sin saltarse las partes feas.
        </p>
      </header>

      {entradas.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Todavía no hay ninguna entrada publicada.
        </p>
      ) : (
        <div className="grid gap-14">
          {entradas.map((entrada) => {
            const portada = entrada.images[0];
            return (
              <article
                key={entrada.id}
                className="grid gap-6 sm:grid-cols-[2fr_3fr]"
              >
                {portada ? (
                  <Link href={`/diario/${entrada.slug}`} className="impasto block">
                    <PaintingImage
                      basePath={portada.basePath}
                      widths={portada.widths}
                      width={portada.width}
                      height={portada.height}
                      blurDataUrl={portada.blurDataUrl}
                      alt={portada.alt ?? entrada.title}
                      sizes="(max-width: 640px) 90vw, 35vw"
                      className="w-full"
                    />
                  </Link>
                ) : null}

                <div>
                  <p className="tabular text-xs tracking-[0.2em] text-[color:var(--color-ink-soft)] uppercase">
                    {formatoFecha.format(entrada.publishedAt)}
                  </p>
                  <h2 className="display mt-2 text-2xl">
                    <Link href={`/diario/${entrada.slug}`}>{entrada.title}</Link>
                  </h2>
                  {entrada.summary ? (
                    <p className="mt-3 text-[color:var(--color-ink-soft)]">
                      {entrada.summary}
                    </p>
                  ) : null}
                  {entrada.painting?.published ? (
                    <p className="mt-3 text-sm">
                      Sobre{" "}
                      <Link
                        href={`/obra/${entrada.painting.slug}`}
                        className="underline"
                      >
                        {entrada.painting.title}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
