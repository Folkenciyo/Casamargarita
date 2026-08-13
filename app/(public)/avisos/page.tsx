import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubscribeForm } from "@/components/public/SubscribeForm";
import { newsletterActivada } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Avisos de obra nueva",
  description: "Un correo cuando entra obra nueva en la galería. Nada más.",
};

export default function AvisosPage() {
  // Apagado hasta que existan la política de privacidad y el responsable del
  // tratamiento: la página entera desaparece, no se queda a medias.
  if (!newsletterActivada()) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="display text-[length:var(--text-title)]">
        Avisos de obra nueva
      </h1>
      <p className="lead mt-4">
        Un correo cuando entra obra nueva en la galería. Ni promociones, ni
        boletines largos, ni tu dirección en manos de nadie más.
      </p>

      <div className="mt-8">
        <SubscribeForm />
      </div>

      <p className="mt-10 text-sm text-[color:var(--color-ink-soft)]">
        Para apuntarte hace falta confirmar desde el correo que recibas. Puedes
        darte de baja con un clic desde cualquier aviso.{" "}
        <Link href="/privacidad" className="underline">
          Cómo se tratan tus datos
        </Link>
        .
      </p>
    </div>
  );
}
