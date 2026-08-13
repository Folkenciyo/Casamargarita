import type { Metadata } from "next";
import Link from "next/link";
import { PaintingCard } from "@/components/public/PaintingCard";
import { prisma } from "@/lib/db";
import { publicPaintingWhere } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar",
  // Una página de resultados no aporta nada a un buscador: lo que interesa
  // que indexe son las obras, que ya están en el sitemap.
  robots: { index: false },
};

const LIMITE = 48;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const consulta = (await searchParams).q?.trim() ?? "";

  // Se busca en título, descripción y técnica. `contains` con `insensitive`
  // basta para un catálogo de esta escala: la búsqueda de texto completo de
  // Postgres exigiría índices, diccionario en español y mantenerlo, para
  // ganar poco con unas decenas de obras.
  const paintings = consulta
    ? await prisma.painting.findMany({
        where: {
          ...(await publicPaintingWhere()),
          OR: [
            { title: { contains: consulta, mode: "insensitive" } },
            { description: { contains: consulta, mode: "insensitive" } },
            { technique: { contains: consulta, mode: "insensitive" } },
            { series: { title: { contains: consulta, mode: "insensitive" } } },
          ],
        },
        orderBy: { position: "asc" },
        take: LIMITE,
        include: { images: { where: { isPrimary: true }, take: 1 } },
      })
    : [];

  const entradas = consulta
    ? await prisma.journalEntry.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: consulta, mode: "insensitive" } },
            { summary: { contains: consulta, mode: "insensitive" } },
            { body: { contains: consulta, mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
        select: { slug: true, title: true, summary: true },
      })
    : [];

  const total = paintings.length + entradas.length;

  return (
    <>
      <h1 className="display text-[length:var(--text-title)]">Buscar</h1>

      <form action="/buscar" className="mt-6 mb-12 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={consulta}
          autoFocus
          placeholder="Marina, retrato, óleo sobre tabla…"
          aria-label="Buscar en la galería"
          className="w-full max-w-md rounded border border-[color:var(--color-canvas-dim)] bg-white px-4 py-2"
        />
        <button
          type="submit"
          className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
        >
          Buscar
        </button>
      </form>

      {consulta === "" ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Busca por título, por lo que hay pintado, por técnica o por serie.
        </p>
      ) : total === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Nada coincide con «{consulta}».{" "}
          <Link href="/galeria" className="underline">
            Ver toda la galería
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-14">
          {paintings.length > 0 ? (
            <section>
              <h2 className="display mb-8 text-2xl">
                {paintings.length === 1 ? "1 obra" : `${paintings.length} obras`}
              </h2>
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {paintings.map((painting, indice) => (
                  <PaintingCard
                    key={painting.id}
                    painting={painting}
                    priority={indice < 3}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {entradas.length > 0 ? (
            <section>
              <h2 className="display mb-6 text-2xl">En el diario</h2>
              <ul className="grid gap-4">
                {entradas.map((entrada) => (
                  <li key={entrada.slug}>
                    <Link
                      href={`/diario/${entrada.slug}`}
                      className="font-medium underline"
                    >
                      {entrada.title}
                    </Link>
                    {entrada.summary ? (
                      <p className="text-sm text-[color:var(--color-ink-soft)]">
                        {entrada.summary}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
