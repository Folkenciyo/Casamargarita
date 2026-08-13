import Link from "next/link";
import { confirmSubscription } from "@/lib/public/newsletter-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirmar avisos",
  robots: { index: false },
};

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const token = (await searchParams).t ?? "";
  const confirmada = token ? await confirmSubscription(token) : false;

  return (
    <div className="max-w-xl py-16">
      <h1 className="display text-[length:var(--text-title)]">
        {confirmada ? "Listo" : "Ese enlace ya no vale"}
      </h1>
      <p className="lead mt-4">
        {confirmada
          ? "Te avisaremos cuando haya obra nueva. Puedes darte de baja desde cualquier correo."
          : "Puede que el enlace haya caducado o que ya te hayas dado de baja. Si quieres, vuelve a apuntarte."}
      </p>
      <p className="mt-8">
        <Link href="/galeria" className="underline">
          Ir a la galería
        </Link>
      </p>
    </div>
  );
}
