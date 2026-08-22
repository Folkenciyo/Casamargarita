import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageManager } from "@/components/admin/ImageManager";
import { PaintingForm } from "@/components/admin/PaintingForm";
import { DangerButton } from "@/components/admin/DangerButton";
import {
  deletePainting,
  restorePainting,
  updatePainting,
} from "@/lib/admin/actions";
import { DIAS_EN_PAPELERA } from "@/lib/admin/trash";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPaintingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [painting, series] = await Promise.all([
    prisma.painting.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } } },
    }),
    prisma.series.findMany({
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!painting) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link href="/admin/obras" className="text-sm underline">
            ← Obras
          </Link>
          <h1 className="display mt-2 text-2xl">{painting.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/admin/obras/${painting.id}/certificado`}
            className="text-sm underline"
          >
            Certificado
          </Link>
          {painting.published ? (
            <Link
              href={`/obra/${painting.slug}`}
              target="_blank"
              rel="noopener"
              className="text-sm underline"
            >
              Ver en la web ↗
            </Link>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">
              Oculta: no aparece en la web
            </span>
          )}
        </div>
      </div>

      <PaintingForm
        action={updatePainting.bind(null, painting.id)}
        submitLabel="Guardar cambios"
        series={series}
        values={{
          title: painting.title,
          description: painting.description ?? "",
          technique: painting.technique,
          year: painting.year,
          widthCm: painting.widthCm,
          heightCm: painting.heightCm,
          priceCents: painting.priceCents,
          status: painting.status,
          published: painting.published,
          featured: painting.featured,
          seriesId: painting.seriesId,
        }}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <ImageManager
        paintingId={painting.id}
        images={painting.images.map((image) => ({
          id: image.id,
          basePath: image.basePath,
          widths: image.widths,
          // Las del original normalizado: con ellas el panel decide si merece
          // la pena ofrecer los detalles recortados.
          width: image.width,
          height: image.height,
          isPrimary: image.isPrimary,
          alt: image.alt,
        }))}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      {painting.deletedAt ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Esta obra está en la papelera desde el{" "}
            {new Intl.DateTimeFormat("es-ES", {
              day: "numeric",
              month: "long",
            }).format(painting.deletedAt)}
            . No se ve en ninguna parte, pero sus fotos siguen guardadas.
          </p>
          <form action={restorePainting.bind(null, painting.id)} className="mt-3">
            <button
              type="submit"
              className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
            >
              Recuperar esta obra
            </button>
          </form>
        </div>
      ) : (
        <form action={deletePainting.bind(null, painting.id)}>
          <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
            Va a la papelera: desaparece de la web, pero se puede recuperar
            entera durante {DIAS_EN_PAPELERA} días.
          </p>
          <DangerButton
            confirmMessage={`¿Mandar «${painting.title}» a la papelera?`}
          >
            Borrar esta obra
          </DangerButton>
        </form>
      )}
    </>
  );
}
