import { PaintingForm } from "@/components/admin/PaintingForm";
import { createPainting } from "@/lib/admin/actions";

export const metadata = { title: "Nueva obra" };

export default function NewPaintingPage() {
  return (
    <>
      <h1 className="mb-6 display text-2xl">
        Nueva obra
      </h1>
      <p className="mb-6 text-[color:var(--color-ink-soft)]">
        Guarda primero los datos; después podrás subir las fotos.
      </p>
      <PaintingForm action={createPainting} submitLabel="Crear obra" />
    </>
  );
}
