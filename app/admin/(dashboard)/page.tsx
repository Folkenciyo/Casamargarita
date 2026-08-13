import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { obrasMasMiradas } from "@/lib/stats";
import { PAINTING_STATUSES, STATUS_LABELS } from "@/lib/validation/painting";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumen" };

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Obra que no está en la papelera: la única que cuenta para el resumen. */
const VIVAS = { deletedAt: null } as const;

export default async function AdminOverviewPage() {
  const [
    total,
    published,
    withoutImage,
    byStatus,
    availableValue,
    unreadInquiries,
    recentInquiries,
    recentPaintings,
    settings,
    masMiradas,
  ] = await Promise.all([
    // `deletedAt: null` en todas: lo que está en la papelera no cuenta para
    // ninguna cifra, o el resumen mentiría sobre el tamaño del catálogo.
    prisma.painting.count({ where: VIVAS }),
    prisma.painting.count({ where: { ...VIVAS, published: true } }),
    // Una obra sin foto ocupa sitio en la galería y no enseña nada: es el
    // único aviso del panel que pide acción.
    prisma.painting.count({ where: { ...VIVAS, images: { none: {} } } }),
    prisma.painting.groupBy({
      by: ["status"],
      where: VIVAS,
      _count: { _all: true },
    }),
    prisma.painting.aggregate({
      where: { ...VIVAS, status: "AVAILABLE", published: true },
      _sum: { priceCents: true },
    }),
    // Sin contestar y no sin leer: leer una consulta no atiende a nadie, y
    // es lo pendiente de verdad lo que tiene que saltar en el resumen.
    prisma.inquiry.count({ where: { answeredAt: null } }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { painting: { select: { title: true, slug: true } } },
    }),
    prisma.painting.findMany({
      where: VIVAS,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        published: true,
        createdAt: true,
      },
    }),
    getSiteSettings(),
    obrasMasMiradas(),
  ]);

  const counts = new Map(byStatus.map((row) => [row.status, row._count._all]));
  const countOf = (status: (typeof PAINTING_STATUSES)[number]) =>
    counts.get(status) ?? 0;

  const hidden = total - published;
  const soldCount = countOf("SOLD");

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-2xl">Resumen</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/obras/nueva"
            className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
          >
            Añadir obra
          </Link>
          <Link
            href="/admin/obras"
            className="rounded border border-[color:var(--color-canvas-dim)] px-4 py-2"
          >
            Gestionar obras
          </Link>
          <Link
            href="/admin/dossier"
            className="rounded border border-[color:var(--color-canvas-dim)] px-4 py-2"
          >
            Dossier en PDF
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <p className="rounded border border-[color:var(--color-canvas-dim)] bg-white p-6 text-[color:var(--color-ink-soft)]">
          La galería está vacía. Empieza por{" "}
          <Link href="/admin/obras/nueva" className="underline">
            añadir la primera obra
          </Link>
          .
        </p>
      ) : (
        <>
          <section aria-labelledby="cifras">
            <h2 id="cifras" className="sr-only">
              Cifras del catálogo
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Obras en catálogo"
                value={total}
                hint={
                  hidden > 0
                    ? `${published} publicadas · ${hidden} ocultas`
                    : "todas publicadas"
                }
                href="/admin/obras"
              />
              <StatCard
                label="Disponibles"
                value={countOf("AVAILABLE")}
                hint={
                  availableValue._sum.priceCents
                    ? `${formatPrice(availableValue._sum.priceCents)} en catálogo`
                    : "sin precio asignado"
                }
                href="/admin/obras?estado=AVAILABLE"
              />
              <StatCard
                label="Vendidas"
                value={soldCount}
                hint={
                  settings.showSoldPaintings
                    ? "visibles en la galería"
                    : "ocultas al público"
                }
                href="/admin/obras?estado=SOLD"
                tone="accent"
              />
              <StatCard
                label="Consultas pendientes"
                value={unreadInquiries}
                hint={
                  unreadInquiries > 0 ? "sin contestar todavía" : "todo al día"
                }
                href="/admin/consultas"
                tone={unreadInquiries > 0 ? "accent" : "plain"}
              />
            </div>
          </section>

          {withoutImage > 0 ? (
            <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {withoutImage === 1
                ? "Hay 1 obra sin ninguna foto: en la galería sale como un hueco gris."
                : `Hay ${withoutImage} obras sin ninguna foto: en la galería salen como huecos grises.`}{" "}
              <Link href="/admin/obras?foto=sin" className="underline">
                Verlas
              </Link>
            </p>
          ) : null}

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="consultas-recientes">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id="consultas-recientes" className="display text-xl">
                  Últimas consultas
                </h2>
                <Link href="/admin/consultas" className="text-sm underline">
                  Ver todas
                </Link>
              </div>

              {recentInquiries.length === 0 ? (
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  Todavía no ha escrito nadie.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {recentInquiries.map((inquiry) => (
                    <li
                      key={inquiry.id}
                      className="rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {inquiry.name}
                          {inquiry.readAt ? null : (
                            <span className="ml-2 rounded-full bg-[color:var(--color-oil)] px-2 py-0.5 text-xs text-[color:var(--color-canvas)]">
                              nueva
                            </span>
                          )}
                        </span>
                        <span className="tabular text-xs text-[color:var(--color-ink-soft)]">
                          {dateFormatter.format(inquiry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">
                        {inquiry.painting
                          ? `Sobre «${inquiry.painting.title}». `
                          : ""}
                        {inquiry.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="obras-recientes">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id="obras-recientes" className="display text-xl">
                  Últimas obras añadidas
                </h2>
                <Link href="/admin/obras" className="text-sm underline">
                  Ver todas
                </Link>
              </div>

              <ul className="grid gap-2">
                {recentPaintings.map((painting) => (
                  <li
                    key={painting.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
                  >
                    <Link
                      href={`/admin/obras/${painting.id}`}
                      className="font-medium underline"
                    >
                      {painting.title}
                    </Link>
                    <span className="text-sm text-[color:var(--color-ink-soft)]">
                      {STATUS_LABELS[painting.status]}
                      {painting.published ? "" : " · oculta"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {masMiradas.length > 0 ? (
            <section className="mt-10" aria-labelledby="miradas">
              <h2 id="miradas" className="display mb-2 text-xl">
                Lo más mirado
              </h2>
              <p className="mb-4 text-sm text-[color:var(--color-ink-soft)]">
                Últimos 30 días. Una obra muy vista y poco preguntada suele
                querer decir que algo de su ficha —el precio, las fotos, las
                medidas— está frenando a quien se lo estaba pensando.
              </p>
              <ul className="grid gap-2">
                {masMiradas.map((obra) => (
                  <li
                    key={obra.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
                  >
                    <Link
                      href={`/admin/obras/${obra.id}`}
                      className="font-medium underline"
                    >
                      {obra.title}
                    </Link>
                    <span className="tabular text-sm text-[color:var(--color-ink-soft)]">
                      {obra.visitas === 1 ? "1 visita" : `${obra.visitas} visitas`}
                      <span className="mx-2 opacity-40">·</span>
                      {obra.consultas === 1
                        ? "1 consulta"
                        : `${obra.consultas} consultas`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10" aria-labelledby="reparto">
            <h2 id="reparto" className="display mb-4 text-xl">
              Reparto por estado
            </h2>
            <div className="grid gap-3 sm:grid-cols-4">
              {PAINTING_STATUSES.map((status) => (
                <StatCard
                  key={status}
                  label={STATUS_LABELS[status]}
                  value={countOf(status)}
                  href={`/admin/obras?estado=${status}`}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
