import Link from "next/link";
import { movePainting } from "@/lib/admin/actions";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";
import { STATUS_LABELS } from "@/lib/validation/painting";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Conserva `q` y añade `page` solo si no es la primera: /admin en vez de /admin?page=1. */
function pageHref(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

export default async function AdminPaintingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: rawQ, page: rawPage } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const page = parsePage(rawPage);

  const where = q ? { title: { contains: q, mode: "insensitive" as const } } : {};

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-2xl">
          Obras ({total})
        </h1>
        <Link
          href="/admin/obras/nueva"
          className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
        >
          Añadir obra
        </Link>
      </div>

      <form action="/admin" className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título"
          aria-label="Buscar obras por título"
          className="w-full max-w-sm rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
        <button
          type="submit"
          className="rounded border border-[color:var(--color-canvas-dim)] px-4 py-2"
        >
          Buscar
        </button>
        {q ? (
          <Link href="/admin" className="text-sm underline">
            Quitar filtro
          </Link>
        ) : null}
      </form>

      {paintings.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          {q
            ? `Ninguna obra coincide con «${q}».`
            : "Todavía no hay obras. Empieza por añadir la primera."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {paintings.map((painting) => {
            const cover = painting.images[0];
            return (
              <li
                key={painting.id}
                className="flex items-center gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-[color:var(--color-canvas-dim)]">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl(cover.basePath, cover.widths[0] ?? 400, "webp")}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/obras/${painting.id}`}
                    className="font-medium underline"
                  >
                    {painting.title}
                  </Link>
                  <p className="text-sm text-[color:var(--color-ink-soft)]">
                    {formatDimensions(painting.widthCm, painting.heightCm)} ·{" "}
                    {formatPrice(painting.priceCents, painting.currency)} ·{" "}
                    {STATUS_LABELS[painting.status]}
                    {painting.published ? "" : " · oculta"}
                  </p>
                </div>

                <div className="flex gap-1">
                  {/* Buscando, el vecino de posición puede no estar ni en pantalla:
                      se desactiva para no reordenar a ciegas contra una obra que
                      no coincide con el filtro. */}
                  <form action={movePainting.bind(null, painting.id, "up")}>
                    <button
                      type="submit"
                      disabled={Boolean(q)}
                      aria-label={`Subir ${painting.title}`}
                      className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 disabled:opacity-30"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={movePainting.bind(null, painting.id, "down")}>
                    <button
                      type="submit"
                      disabled={Boolean(q)}
                      aria-label={`Bajar ${painting.title}`}
                      className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Paginación"
          className="mt-6 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link href={pageHref(q, page - 1)} className="text-sm underline">
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
            <Link href={pageHref(q, page + 1)} className="text-sm underline">
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
