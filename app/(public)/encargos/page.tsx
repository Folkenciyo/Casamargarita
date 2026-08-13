import type { Metadata } from "next";
import { CommissionForm } from "@/components/public/CommissionForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encargos",
  description:
    "Encargar un óleo por medida: qué contar, qué tamaños hay y qué precio orientativo tiene.",
};

export default function EncargosPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="display text-[length:var(--text-title)]">Encargos</h1>
      <p className="lead mt-4">
        Un encargo no es un cuadro más rápido: es un cuadro que empieza en una
        conversación. Cuéntame qué tienes en mente y te digo con franqueza si
        puedo hacerlo, cuánto costaría y cuánto tardaría.
      </p>

      <div className="mt-8 grid gap-3 text-sm text-[color:var(--color-ink-soft)]">
        <p>
          <strong className="text-[color:var(--color-ink)]">Cómo va.</strong>{" "}
          Hablamos, te paso un presupuesto y un plazo, y solo entonces empiezo.
          Verás la obra a medio hacer antes de darla por terminada.
        </p>
        <p>
          <strong className="text-[color:var(--color-ink)]">Qué ayuda.</strong>{" "}
          Fotos del sitio donde va a colgar, la luz que tiene y qué obra mía te
          ha hecho escribir. Con eso se acierta mucho más.
        </p>
      </div>

      <div className="mt-10">
        <CommissionForm />
      </div>
    </div>
  );
}
