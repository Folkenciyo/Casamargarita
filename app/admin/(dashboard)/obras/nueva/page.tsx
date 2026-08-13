import { PaintingForm } from "@/components/admin/PaintingForm";
import { createPainting } from "@/lib/admin/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva obra" };

export default async function NewPaintingPage() {
  const series = await prisma.series.findMany({
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <h1 className="mb-6 display text-2xl">
        Nueva obra
      </h1>
      <p className="mb-6 text-[color:var(--color-ink-soft)]">
        Guarda primero los datos; después podrás subir las fotos.
      </p>
      <PaintingForm
        action={createPainting}
        submitLabel="Crear obra"
        series={series}
      />
    </>
  );
}
