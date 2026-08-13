import Link from "next/link";
import { unsubscribe } from "@/lib/public/newsletter-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Baja", robots: { index: false } };

/**
 * La baja se ejecuta al abrir el enlace, sin pedir confirmación: poner una
 * pantalla intermedia entre alguien y su derecho a irse es de mal gusto y,
 * además, ilegal si complica el trámite.
 */
export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const token = (await searchParams).t ?? "";
  const dada = token ? await unsubscribe(token) : false;

  return (
    <div className="max-w-xl py-16">
      <h1 className="display text-[length:var(--text-title)]">
        {dada ? "Te hemos dado de baja" : "No hemos encontrado esa suscripción"}
      </h1>
      <p className="lead mt-4">
        {dada
          ? "No recibirás más avisos y tu correo se ha borrado de la lista."
          : "Puede que ya estuvieras dada de baja. En cualquier caso, no recibirás más avisos."}
      </p>
      <p className="mt-8">
        <Link href="/galeria" className="underline">
          Ir a la galería
        </Link>
      </p>
    </div>
  );
}
