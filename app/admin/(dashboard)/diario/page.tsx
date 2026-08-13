import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Diario" };

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminJournalPage() {
  const entradas = await prisma.journalEntry.findMany({
    orderBy: { publishedAt: "desc" },
    include: {
      _count: { select: { images: true } },
      painting: { select: { title: true } },
    },
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-2xl">
          Diario{" "}
          <span className="tabular text-[color:var(--color-ink-soft)]">
            ({entradas.length})
          </span>
        </h1>
        <Link
          href="/admin/diario/nueva"
          className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
        >
          Nueva entrada
        </Link>
      </div>

      {entradas.length === 0 ? (
        <div className="max-w-2xl rounded border border-[color:var(--color-canvas-dim)] bg-white p-6">
          <p className="text-[color:var(--color-ink-soft)]">
            Una obra contada en cinco fotos: la mancha, las veladuras, el
            empaste, el barniz, colgada. Es lo único de esta web que no puede
            escribir nadie más, y lo que hace que una obra tenga historia.
          </p>
          <Link
            href="/admin/diario/nueva"
            className="mt-4 inline-block underline"
          >
            Escribir la primera
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {entradas.map((entrada) => (
            <li
              key={entrada.id}
              className="flex flex-wrap items-center gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/diario/${entrada.id}`}
                  className="font-medium underline"
                >
                  {entrada.title}
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  {formatoFecha.format(entrada.publishedAt)}
                  <span className="mx-2 opacity-40">·</span>
                  {entrada._count.images === 1
                    ? "1 foto"
                    : `${entrada._count.images} fotos`}
                  {entrada.painting ? (
                    <>
                      <span className="mx-2 opacity-40">·</span>
                      sobre «{entrada.painting.title}»
                    </>
                  ) : null}
                </p>
              </div>

              <span
                className={
                  entrada.published
                    ? "rounded-full bg-[color:var(--color-canvas-dim)] px-3 py-1 text-xs"
                    : "rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
                }
              >
                {entrada.published ? "Publicada" : "Borrador"}
              </span>

              {entrada.published ? (
                <Link
                  href={`/diario/${entrada.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="text-sm underline"
                >
                  Ver ↗
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
