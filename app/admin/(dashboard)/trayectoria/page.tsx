import { DangerButton } from "@/components/admin/DangerButton";
import { MilestoneForm } from "@/components/admin/MilestoneForm";
import {
  deleteMilestone,
  toggleMilestonePublished,
} from "@/lib/admin/milestone-actions";
import { prisma } from "@/lib/db";
import { agruparPorTipo } from "@/lib/milestones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trayectoria" };

export default async function AdminMilestonesPage() {
  const hitos = await prisma.milestone.findMany({
    orderBy: [{ year: "desc" }, { position: "desc" }],
  });

  const grupos = agruparPorTipo(hitos);

  return (
    <>
      <h1 className="display mb-2 text-2xl">Trayectoria</h1>
      <p className="mb-8 max-w-2xl text-[color:var(--color-ink-soft)]">
        Exposiciones, premios, colecciones donde hay obra tuya y menciones en
        prensa. Sale en la ficha de artista, agrupado y de lo más reciente a lo
        más antiguo. Quien duda entre dos pintores no compara cuadros, compara
        trayectoria.
      </p>

      <MilestoneForm />

      {grupos.length === 0 ? (
        <p className="mt-10 text-[color:var(--color-ink-soft)]">
          Todavía no has añadido nada.
        </p>
      ) : (
        <div className="mt-12 grid gap-10">
          {grupos.map((grupo) => (
            <section key={grupo.kind}>
              <h2 className="display mb-4 text-xl">{grupo.etiqueta}</h2>
              <ul className="grid gap-2">
                {grupo.hitos.map((hito) => (
                  <li
                    key={hito.id}
                    className="flex flex-wrap items-baseline gap-3 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
                  >
                    <span className="tabular w-14 shrink-0 text-[color:var(--color-ink-soft)]">
                      {hito.year}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{hito.title}</p>
                      {hito.place ? (
                        <p className="text-sm text-[color:var(--color-ink-soft)]">
                          {hito.place}
                        </p>
                      ) : null}
                    </div>

                    {hito.published ? null : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">
                        Oculto
                      </span>
                    )}

                    <form action={toggleMilestonePublished.bind(null, hito.id)}>
                      <button type="submit" className="text-sm underline">
                        {hito.published ? "Ocultar" : "Mostrar"}
                      </button>
                    </form>

                    <form action={deleteMilestone.bind(null, hito.id)}>
                      <DangerButton confirmMessage={`¿Borrar «${hito.title}»?`}>
                        Borrar
                      </DangerButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
