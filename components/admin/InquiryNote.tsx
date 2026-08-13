"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveInquiryNote, type InquiryState } from "@/lib/public/actions";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar nota"}
    </button>
  );
}

/**
 * Nota privada sobre una consulta. Empieza plegada para no llenar la bandeja
 * de cajas de texto vacías; si ya hay nota escrita, se ve de entrada, porque
 * entonces es información que hay que leer.
 */
export function InquiryNote({ id, note }: { id: string; note: string }) {
  const [abierta, setAbierta] = useState(note !== "");
  const [estado, formAction] = useActionState<InquiryState, FormData>(
    saveInquiryNote.bind(null, id),
    {},
  );

  if (!abierta) {
    return (
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="mt-3 text-sm underline"
      >
        Añadir una nota
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <label className="text-sm font-medium" htmlFor={`note-${id}`}>
        Nota privada
        <span className="ml-2 font-normal text-[color:var(--color-ink-soft)]">
          solo la ves tú
        </span>
      </label>
      <textarea
        id={`note-${id}`}
        name="note"
        rows={2}
        maxLength={2000}
        defaultValue={note}
        placeholder="Pidió verla en persona. Llamar el jueves."
        className="w-full rounded border border-[color:var(--color-canvas-dim)] bg-[color:var(--color-canvas)]/60 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <Guardar />
        {estado.ok ? (
          <span role="status" className="text-sm text-green-800">
            Nota guardada
          </span>
        ) : null}
      </div>
    </form>
  );
}
