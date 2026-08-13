import Link from "next/link";
import { JournalForm } from "@/components/admin/JournalForm";
import { createJournalEntry } from "@/lib/admin/journal-actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva entrada" };

export default async function NuevaEntradaPage() {
  const obras = await prisma.painting.findMany({
    where: { deletedAt: null },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <Link href="/admin/diario" className="text-sm underline">
        ← Diario
      </Link>
      <h1 className="display mt-2 mb-2 text-2xl">Nueva entrada</h1>
      <p className="mb-6 max-w-2xl text-[color:var(--color-ink-soft)]">
        Guarda primero el texto; después podrás añadir las fotos del proceso.
      </p>

      <JournalForm
        action={createJournalEntry}
        texto="Crear entrada"
        obras={obras}
      />
    </>
  );
}
