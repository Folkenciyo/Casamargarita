import Link from "next/link";
import { prisma } from "@/lib/db";
import { markInquiryRead } from "@/lib/public/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultas" };

const formatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function InquiriesPage() {
  const inquiries = await prisma.inquiry.findMany({
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    include: { painting: { select: { slug: true, title: true } } },
  });

  return (
    <>
      <h1 className="mb-6 display text-2xl">
        Consultas ({inquiries.filter((i) => !i.readAt).length} sin leer)
      </h1>

      {inquiries.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Todavía no hay consultas.
        </p>
      ) : (
        <ul className="grid gap-3">
          {inquiries.map((inquiry) => (
            <li
              key={inquiry.id}
              className={`rounded border p-4 ${
                inquiry.readAt
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

              {inquiry.readAt ? null : (
                <form
                  action={markInquiryRead.bind(null, inquiry.id)}
                  className="mt-3"
                >
                  <button type="submit" className="text-sm underline">
                    Marcar como leída
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
