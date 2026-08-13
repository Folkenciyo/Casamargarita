import Link from "next/link";
import { InquiryNote } from "@/components/admin/InquiryNote";
import { prisma } from "@/lib/db";
import { markInquiryRead, toggleInquiryAnswered } from "@/lib/public/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultas" };

const formatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function InquiriesPage() {
  const inquiries = await prisma.inquiry.findMany({
    // Lo pendiente primero: sin contestar arriba, y dentro de eso lo más
    // reciente. Una consulta contestada ya no reclama nada.
    //
    // `nulls: "first"` es imprescindible: en Postgres un ORDER BY ascendente
    // manda los nulos al final, así que sin esto saldrían arriba justo las ya
    // contestadas.
    orderBy: [
      { answeredAt: { sort: "asc", nulls: "first" } },
      { readAt: { sort: "asc", nulls: "first" } },
      { createdAt: "desc" },
    ],
    include: { painting: { select: { slug: true, title: true } } },
  });

  const sinLeer = inquiries.filter((consulta) => !consulta.readAt).length;
  const sinContestar = inquiries.filter(
    (consulta) => !consulta.answeredAt,
  ).length;

  return (
    <>
      <h1 className="display mb-2 text-2xl">Consultas</h1>
      <p className="mb-6 text-sm text-[color:var(--color-ink-soft)]">
        {inquiries.length === 0
          ? "Ninguna todavía"
          : `${sinLeer} sin leer · ${sinContestar} sin contestar · ${inquiries.length} en total`}
      </p>

      {inquiries.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Todavía no hay consultas.
        </p>
      ) : (
        <ul className="grid gap-3">
          {inquiries.map((inquiry) => {
            const asunto = inquiry.painting
              ? `Re: ${inquiry.painting.title}`
              : "Re: tu consulta";
            const saludo = `Hola ${inquiry.name.split(" ")[0] ?? ""},`;

            return (
              <li
                key={inquiry.id}
                className={`rounded border p-4 ${
                  inquiry.answeredAt
                    ? "border-[color:var(--color-canvas-dim)] bg-white opacity-75"
                    : inquiry.readAt
                      ? "border-[color:var(--color-canvas-dim)] bg-white"
                      : "border-[color:var(--color-oil)] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <strong>{inquiry.name}</strong>
                  <a href={`mailto:${inquiry.email}`} className="underline">
                    {inquiry.email}
                  </a>
                  <span className="text-sm text-[color:var(--color-ink-soft)]">
                    {formatter.format(inquiry.createdAt)}
                  </span>
                  {inquiry.answeredAt ? (
                    <span className="rounded-full bg-[color:var(--color-canvas-dim)] px-2 py-0.5 text-xs">
                      contestada
                    </span>
                  ) : null}
                </div>

                {inquiry.painting ? (
                  <p className="mt-1 text-sm">
                    Sobre{" "}
                    <Link
                      href={`/obra/${inquiry.painting.slug}`}
                      className="underline"
                    >
                      {inquiry.painting.title}
                    </Link>
                  </p>
                ) : null}

                <p className="mt-3 whitespace-pre-line">{inquiry.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {/* Se abre el correo de siempre con el asunto y el saludo ya
                      puestos: contestar desde el panel obligaría a montar un
                      buzón de salida y a que las respuestas se perdieran fuera
                      del hilo de correo de la artista. */}
                  <a
                    href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                      asunto,
                    )}&body=${encodeURIComponent(`${saludo}\n\n`)}`}
                    className="rounded bg-[color:var(--color-ink)] px-3 py-1.5 text-sm text-[color:var(--color-canvas)]"
                  >
                    Responder por correo
                  </a>

                  <form action={toggleInquiryAnswered.bind(null, inquiry.id)}>
                    <button type="submit" className="text-sm underline">
                      {inquiry.answeredAt
                        ? "Marcar como pendiente"
                        : "Marcar como contestada"}
                    </button>
                  </form>

                  {inquiry.readAt || inquiry.answeredAt ? null : (
                    <form action={markInquiryRead.bind(null, inquiry.id)}>
                      <button type="submit" className="text-sm underline">
                        Marcar como leída
                      </button>
                    </form>
                  )}
                </div>

                <InquiryNote id={inquiry.id} note={inquiry.note} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
