import Link from "next/link";
import { notFound } from "next/navigation";
import { DangerButton } from "@/components/admin/DangerButton";
import { JournalForm } from "@/components/admin/JournalForm";
import { JournalImages } from "@/components/admin/JournalImages";
import {
  deleteJournalEntry,
  updateJournalEntry,
} from "@/lib/admin/journal-actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** El input date quiere AAAA-MM-DD, no un ISO completo. */
function paraInputDate(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export default async function EditarEntradaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entrada, obras] = await Promise.all([
    prisma.journalEntry.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } } },
    }),
    prisma.painting.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!entrada) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link href="/admin/diario" className="text-sm underline">
            ← Diario
          </Link>
          <h1 className="display mt-2 text-2xl">{entrada.title}</h1>
        </div>
        {entrada.published ? (
          <Link
            href={`/diario/${entrada.slug}`}
            target="_blank"
            rel="noopener"
            className="text-sm underline"
          >
            Ver en la web ↗
          </Link>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">
            Borrador: no aparece en la web
          </span>
        )}
      </div>

      <JournalForm
        action={updateJournalEntry.bind(null, entrada.id)}
        texto="Guardar cambios"
        obras={obras}
        valores={{
          title: entrada.title,
          summary: entrada.summary,
          body: entrada.body,
          published: entrada.published,
          publishedAt: paraInputDate(entrada.publishedAt),
          paintingId: entrada.paintingId,
        }}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <JournalImages
        entryId={entrada.id}
        images={entrada.images.map((imagen) => ({
          id: imagen.id,
          basePath: imagen.basePath,
          widths: imagen.widths,
          alt: imagen.alt,
          caption: imagen.caption,
        }))}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <form action={deleteJournalEntry.bind(null, entrada.id)}>
        <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
          Se borra la entrada y sus fotos del proceso. La obra de la que habla
          no se toca.
        </p>
        <DangerButton confirmMessage={`¿Borrar «${entrada.title}» y sus fotos?`}>
          Borrar esta entrada
        </DangerButton>
      </form>
    </>
  );
}
