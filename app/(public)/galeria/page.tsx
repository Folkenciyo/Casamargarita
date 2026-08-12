import type { Metadata } from "next";
import Link from "next/link";
import { PaintingCard } from "@/components/public/PaintingCard";
import { prisma } from "@/lib/db";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galería",
  description:
    "Catálogo de obra original al óleo, con medidas, técnica y disponibilidad.",
};

// Múltiplo de 2 y 3: la última fila queda completa tanto en dos columnas
// (móvil/tablet) como en tres (escritorio).
const PAGE_SIZE = 24;

function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const where = { published: true };

  const [total, paintings] = await Promise.all([
    prisma.painting.count({ where }),
    prisma.painting.findMany({
      where,
      orderBy: { position: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { images: { where: { isPrimary: true }, take: 1 } },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-[length:var(--text-title)]">Galería</h1>
        {/* Solo tiene sentido en pantalla grande; la propia sala lo verifica. */}
        <Link href="/galeria/sala" className="hidden text-sm underline lg:block">
          Verla como sala
        </Link>
      </div>

      {paintings.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Todavía no hay obra publicada.
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {paintings.map((painting, index) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              priority={index < 3}
            />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Paginación"
          className="mt-14 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link
              href={page - 1 > 1 ? `/galeria?page=${page - 1}` : "/galeria"}
              className="text-sm underline"
            >
              Anterior
            </Link>
          ) : (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              Anterior
            </span>
          )}
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            Página {page} de {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/galeria?page=${page + 1}`} className="text-sm underline">
              Siguiente
            </Link>
          ) : (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              Siguiente
            </span>
          )}
        </nav>
      ) : null}
    </>
  );
}
