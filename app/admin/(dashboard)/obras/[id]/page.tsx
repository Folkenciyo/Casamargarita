import { notFound } from "next/navigation";
import { ImageManager } from "@/components/admin/ImageManager";
import { PaintingForm } from "@/components/admin/PaintingForm";
import { DangerButton } from "@/components/admin/DangerButton";
import { deletePainting, updatePainting } from "@/lib/admin/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPaintingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const painting = await prisma.painting.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!painting) notFound();

  return (
    <>
      <h1 className="mb-6 display text-2xl">
        {painting.title}
      </h1>

      <PaintingForm
        action={updatePainting.bind(null, painting.id)}
        submitLabel="Guardar cambios"
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
        }}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <ImageManager
        paintingId={painting.id}
        images={painting.images.map((image) => ({
          id: image.id,
          basePath: image.basePath,
          widths: image.widths,
          isPrimary: image.isPrimary,
          alt: image.alt,
        }))}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <form action={deletePainting.bind(null, painting.id)}>
        <DangerButton confirmMessage={`¿Borrar «${painting.title}» y sus fotos?`}>
          Borrar esta obra
        </DangerButton>
      </form>
    </>
  );
}
