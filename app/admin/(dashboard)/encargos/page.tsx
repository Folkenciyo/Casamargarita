import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/catalog";
import { horquillaEncargo } from "@/lib/commissions";
import { toggleCommissionAnswered } from "@/lib/public/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encargos" };

const formato = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminCommissionsPage() {
  const encargos = await prisma.commission.findMany({
    // Igual que en consultas: lo pendiente arriba, y los nulos primero, que
    // en Postgres no es lo que hace un ORDER BY ascendente por defecto.
    orderBy: [
      { answeredAt: { sort: "asc", nulls: "first" } },
      { createdAt: "desc" },
    ],
  });

  const pendientes = encargos.filter((encargo) => !encargo.answeredAt).length;

  return (
    <>
      <h1 className="display mb-2 text-2xl">Encargos</h1>
      <p className="mb-6 text-sm text-[color:var(--color-ink-soft)]">
        {encargos.length === 0
          ? "Ninguna petición todavía"
          : `${pendientes} sin contestar · ${encargos.length} en total`}
      </p>

      {encargos.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Las peticiones de encargo llegan desde{" "}
          <span className="tabular">/encargos</span>.
        </p>
      ) : (
        <ul className="grid gap-3">
          {encargos.map((encargo) => {
            const horquilla =
              encargo.widthCm && encargo.heightCm
                ? horquillaEncargo(encargo.widthCm, encargo.heightCm)
                : null;

            return (
              <li
                key={encargo.id}
                className={`rounded border p-4 ${
                  encargo.answeredAt
                    ? "border-[color:var(--color-canvas-dim)] bg-white opacity-75"
                    : "border-[color:var(--color-oil)] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <strong>{encargo.name}</strong>
                  <a href={`mailto:${encargo.email}`} className="underline">
                    {encargo.email}
                  </a>
                  <span className="text-sm text-[color:var(--color-ink-soft)]">
                    {formato.format(encargo.createdAt)}
                  </span>
                  {encargo.answeredAt ? (
                    <span className="rounded-full bg-[color:var(--color-canvas-dim)] px-2 py-0.5 text-xs">
                      contestado
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 whitespace-pre-line">{encargo.brief}</p>

                <p className="tabular mt-3 text-sm text-[color:var(--color-ink-soft)]">
                  {encargo.widthCm && encargo.heightCm
                    ? `${encargo.widthCm} × ${encargo.heightCm} cm`
                    : "Sin medidas"}
                  {encargo.deadline ? (
                    <>
                      <span className="mx-2 opacity-40">·</span>
                      {encargo.deadline}
                    </>
                  ) : null}
                  {horquilla ? (
                    <>
                      <span className="mx-2 opacity-40">·</span>
                      se le dijo {formatPrice(horquilla.desdeCentimos)}–
                      {formatPrice(horquilla.hastaCentimos)}
                    </>
                  ) : null}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={`mailto:${encargo.email}?subject=${encodeURIComponent(
                      "Re: tu encargo",
                    )}&body=${encodeURIComponent(
                      `Hola ${encargo.name.split(" ")[0] ?? ""},\n\n`,
                    )}`}
                    className="rounded bg-[color:var(--color-ink)] px-3 py-1.5 text-sm text-[color:var(--color-canvas)]"
                  >
                    Responder por correo
                  </a>
                  <form action={toggleCommissionAnswered.bind(null, encargo.id)}>
                    <button type="submit" className="text-sm underline">
                      {encargo.answeredAt
                        ? "Marcar como pendiente"
                        : "Marcar como contestado"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
