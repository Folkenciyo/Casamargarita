import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Series" };

export default async function AdminSeriesPage() {
  const series = await prisma.series.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { paintings: true } } },
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-2xl">
          Series{" "}
          <span className="tabular text-[color:var(--color-ink-soft)]">
            ({series.length})
          </span>
        </h1>
        <Link
          href="/admin/series/nueva"
          className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
        >
          Nueva serie
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="max-w-2xl rounded border border-[color:var(--color-canvas-dim)] bg-white p-6">
          <p className="text-[color:var(--color-ink-soft)]">
            Una serie agrupa obra que se explica junta: un lugar, una temporada,
            una manera de mirar. Tiene su propia página y su propio texto, y una
            obra puede estar en una o en ninguna.
          </p>
          <Link href="/admin/series/nueva" className="mt-4 inline-block underline">
            Crear la primera
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {series.map((serie) => (
            <li
              key={serie.id}
              className="flex flex-wrap items-center gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/series/${serie.id}`}
                  className="font-medium underline"
                >
                  {serie.title}
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  {serie._count.paintings === 1
                    ? "1 obra"
                    : `${serie._count.paintings} obras`}
                </p>
              </div>

              <span
                className={
                  serie.published
                    ? "rounded-full bg-[color:var(--color-canvas-dim)] px-3 py-1 text-xs"
                    : "rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
                }
              >
                {serie.published ? "Visible" : "Oculta"}
              </span>

              {serie.published ? (
                <Link
                  href={`/serie/${serie.slug}`}
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
