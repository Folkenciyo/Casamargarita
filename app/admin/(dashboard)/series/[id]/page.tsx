import Link from "next/link";
import { notFound } from "next/navigation";
import { DangerButton } from "@/components/admin/DangerButton";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { deleteSeries, updateSeries } from "@/lib/admin/series-actions";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/validation/painting";

export const dynamic = "force-dynamic";

export default async function EditarSeriePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serie = await prisma.series.findUnique({
    where: { id },
    include: {
      paintings: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, status: true, published: true },
      },
    },
  });
  if (!serie) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link href="/admin/series" className="text-sm underline">
            ← Series
          </Link>
          <h1 className="display mt-2 text-2xl">{serie.title}</h1>
        </div>
        {serie.published ? (
          <Link
            href={`/serie/${serie.slug}`}
            target="_blank"
            rel="noopener"
            className="text-sm underline"
          >
            Ver en la web ↗
          </Link>
        ) : null}
      </div>

      <SeriesForm
        action={updateSeries.bind(null, serie.id)}
        etiqueta="Guardar cambios"
        valores={{
          title: serie.title,
          description: serie.description,
          published: serie.published,
        }}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <section>
        <h2 className="display mb-4 text-xl">Obra en esta serie</h2>
        {serie.paintings.length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            Todavía no hay ninguna. La serie se asigna desde la ficha de cada
            obra, en el desplegable «Serie».
          </p>
        ) : (
          <ul className="grid gap-2">
            {serie.paintings.map((obra) => (
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
                <span className="text-sm text-[color:var(--color-ink-soft)]">
                  {STATUS_LABELS[obra.status]}
                  {obra.published ? "" : " · oculta"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <form action={deleteSeries.bind(null, serie.id)}>
        <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
          Borrar la serie deshace la agrupación. Las{" "}
          {serie.paintings.length === 1
            ? "1 obra sigue"
            : `${serie.paintings.length} obras siguen`}{" "}
          en la galería, solo que sin serie.
        </p>
        <DangerButton confirmMessage={`¿Borrar la serie «${serie.title}»?`}>
          Borrar esta serie
        </DangerButton>
      </form>
    </>
  );
}
