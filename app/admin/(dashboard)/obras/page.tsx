import Link from "next/link";
import { redirect } from "next/navigation";
import { DangerButton } from "@/components/admin/DangerButton";
import { FeaturedOrder } from "@/components/admin/FeaturedOrder";
import {
  movePainting,
  purgePainting,
  restorePainting,
  togglePaintingPublished,
} from "@/lib/admin/actions";
import { DIAS_EN_PAPELERA } from "@/lib/admin/trash";
import {
  hasActiveFilters,
  paintingWhere,
  paintingsHref,
  parsePaintingFilters,
} from "@/lib/admin/painting-filters";
import { formatDimensions, formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";
import { PAINTING_STATUSES, STATUS_LABELS } from "@/lib/validation/painting";

export const dynamic = "force-dynamic";
export const metadata = { title: "Obras" };

const PAGE_SIZE = 20;

const control =
  "rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export default async function AdminPaintingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    visibilidad?: string;
    foto?: string;
    papelera?: string;
    page?: string;
  }>;
}) {
  const raw = await searchParams;
  const filters = parsePaintingFilters(raw);

  // Un formulario GET manda también los campos vacíos: sin esto la URL de una
  // búsqueda sería ?q=marina&estado=&visibilidad=&foto=. Se limpia con un
  // redirect en vez de con JavaScript, y así el panel sigue funcionando sin él.
  if (Object.values(raw).some((value) => value === "")) {
    redirect(paintingsHref(filters));
  }

  const where = paintingWhere(filters);
  const filtered = hasActiveFilters(filters);

  const [total, paintings, enPapelera, destacadas] = await Promise.all([
    prisma.painting.count({ where }),
    prisma.painting.findMany({
      where,
      // En la papelera manda lo último que se tiró, no el orden de la galería.
      orderBy: filters.papelera ? { deletedAt: "desc" } : { position: "asc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { images: true, inquiries: true } },
      },
    }),
    prisma.painting.count({ where: { deletedAt: { not: null } } }),
    prisma.painting.findMany({
      where: { featured: true, deletedAt: null },
      orderBy: { featuredPosition: "asc" },
      select: {
        id: true,
        title: true,
        images: { where: { isPrimary: true }, take: 1, select: { basePath: true } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-2xl">
          {filters.papelera ? "Papelera" : "Obras"}{" "}
          <span className="tabular text-[color:var(--color-ink-soft)]">
            ({total})
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {filters.papelera ? (
            <Link href="/admin/obras" className="text-sm underline">
              ← Volver a las obras
            </Link>
          ) : (
            <>
              {enPapelera > 0 ? (
                <Link href="/admin/obras?papelera=si" className="text-sm underline">
                  Papelera ({enPapelera})
                </Link>
              ) : null}
              <Link
                href="/admin/obras/nueva"
                className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
              >
                Añadir obra
              </Link>
            </>
          )}
        </div>
      </div>

      {filters.papelera ? (
        <p className="mb-6 rounded border border-[color:var(--color-canvas-dim)] bg-white p-4 text-sm text-[color:var(--color-ink-soft)]">
          Estas obras no se ven en ninguna parte, pero sus fotos siguen
          guardadas. Se borran solas a los {DIAS_EN_PAPELERA} días de tirarlas.
          Hasta entonces se pueden recuperar enteras.
        </p>
      ) : null}

      {!filters.papelera ? (
        <FeaturedOrder
          paintings={destacadas.map((obra) => ({
            id: obra.id,
            title: obra.title,
            basePath: obra.images[0]?.basePath ?? null,
          }))}
        />
      ) : null}

      {/* GET a la propia ruta: los filtros quedan en la URL y se pueden
          guardar o compartir. Sin JavaScript de por medio. */}
      <form
        action="/admin/obras"
        className="mb-6 flex flex-wrap items-end gap-3 rounded border border-[color:var(--color-canvas-dim)] bg-white p-4"
      >
        <div className="grow">
          <label htmlFor="q" className="block text-sm font-medium">
            Buscar
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Título de la obra"
            className={`${control} w-full`}
          />
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={filters.status ?? ""}
            className={control}
          >
            <option value="">Todos</option>
            {PAINTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visibilidad" className="block text-sm font-medium">
            Visibilidad
          </label>
          <select
            id="visibilidad"
            name="visibilidad"
            defaultValue={
              filters.visibility === "all"
                ? ""
                : filters.visibility === "published"
                  ? "publicadas"
                  : "ocultas"
            }
            className={control}
          >
            <option value="">Todas</option>
            <option value="publicadas">Publicadas</option>
            <option value="ocultas">Ocultas</option>
          </select>
        </div>

        <div>
          <label htmlFor="foto" className="block text-sm font-medium">
            Foto
          </label>
          <select
            id="foto"
            name="foto"
            defaultValue={
              filters.photo === "all"
                ? ""
                : filters.photo === "without"
                  ? "sin"
                  : "con"
            }
            className={control}
          >
            <option value="">Indiferente</option>
            <option value="con">Con foto</option>
            <option value="sin">Sin foto</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded border border-[color:var(--color-canvas-dim)] px-4 py-2"
        >
          Filtrar
        </button>

        {filtered ? (
          <Link href="/admin/obras" className="pb-2 text-sm underline">
            Quitar filtros
          </Link>
        ) : null}
      </form>

      {paintings.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          {filtered
            ? "Ninguna obra coincide con estos filtros."
            : "Todavía no hay obras. Empieza por añadir la primera."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {paintings.map((painting) => (
            <li
              key={painting.id}
              className="flex flex-wrap items-center gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-[color:var(--color-canvas-dim)]">
                {painting.images[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageUrl(
                      painting.images[0].basePath,
                      painting.images[0].widths[0] ?? 400,
                      "webp",
                    )}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-[color:var(--color-ink-soft)]">
                    sin foto
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/obras/${painting.id}`}
                  className="font-medium underline"
                >
                  {painting.title}
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  {formatDimensions(painting.widthCm, painting.heightCm)}
                  <span className="mx-2 opacity-40">·</span>
                  {formatPrice(painting.priceCents, painting.currency)}
                  <span className="mx-2 opacity-40">·</span>
                  {STATUS_LABELS[painting.status]}
                  {painting._count.inquiries > 0 ? (
                    <>
                      <span className="mx-2 opacity-40">·</span>
                      {painting._count.inquiries === 1
                        ? "1 consulta"
                        : `${painting._count.inquiries} consultas`}
                    </>
                  ) : null}
                </p>
              </div>

              {filters.papelera ? (
                <>
                  <span className="tabular text-xs text-[color:var(--color-ink-soft)]">
                    {painting.deletedAt
                      ? `en la papelera desde el ${dateFormatter.format(painting.deletedAt)}`
                      : null}
                  </span>
                  <form action={restorePainting.bind(null, painting.id)}>
                    <button
                      type="submit"
                      className="rounded border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm"
                    >
                      Recuperar
                    </button>
                  </form>
                  <form action={purgePainting.bind(null, painting.id)}>
                    <DangerButton
                      confirmMessage={`¿Borrar «${painting.title}» y sus fotos para siempre? Esto no se puede deshacer.`}
                    >
                      Borrar ya
                    </DangerButton>
                  </form>
                </>
              ) : (
                <>
                  <span
                    className={
                      painting.published
                        ? "rounded-full bg-[color:var(--color-canvas-dim)] px-3 py-1 text-xs"
                        : "rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
                    }
                  >
                    {painting.published ? "Publicada" : "Oculta"}
                  </span>

                  <form action={togglePaintingPublished.bind(null, painting.id)}>
                    <button
                      type="submit"
                      className="rounded border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm"
                    >
                      {painting.published ? "Ocultar" : "Publicar"}
                    </button>
                  </form>
                </>
              )}

              <div className={filters.papelera ? "hidden" : "flex gap-1"}>
                {/* Con filtros puestos, el vecino de posición puede no estar ni
                    en pantalla: se desactiva para no reordenar a ciegas contra
                    una obra que no cumple el filtro. */}
                <form action={movePainting.bind(null, painting.id, "up")}>
                  <button
                    type="submit"
                    disabled={filtered}
                    aria-label={`Subir ${painting.title}`}
                    className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 disabled:opacity-30"
                  >
                    ↑
                  </button>
                </form>
                <form action={movePainting.bind(null, painting.id, "down")}>
                  <button
                    type="submit"
                    disabled={filtered}
                    aria-label={`Bajar ${painting.title}`}
                    className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Paginación"
          className="mt-6 flex items-center justify-between gap-4"
        >
          {filters.page > 1 ? (
            <Link
              href={paintingsHref(filters, { page: filters.page - 1 })}
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
            Página {filters.page} de {pageCount}
          </span>
          {filters.page < pageCount ? (
            <Link
              href={paintingsHref(filters, { page: filters.page + 1 })}
              className="text-sm underline"
            >
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
