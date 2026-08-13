"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { InquiryState } from "@/lib/public/actions";
import { subscribe } from "@/lib/public/newsletter-actions";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Enviando…" : "Avísame"}
    </button>
  );
}

export function SubscribeForm() {
  const [estado, formAction] = useActionState<InquiryState, FormData>(
    subscribe,
    {},
  );

  if (estado.ok) {
    return (
      <p role="status" className="rounded bg-green-50 p-4 text-green-900">
        Te hemos escrito para confirmar. Abre el enlace del correo y listo:
        hasta entonces no recibirás nada.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid max-w-md gap-3">
      {estado.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {estado.error}
        </p>
      ) : null}

      <div>
        <label className="block text-sm" htmlFor="sub-email">
          Correo
        </label>
        <input
          id="sub-email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
      </div>

      <label className="flex items-start gap-2 text-sm" htmlFor="sub-consent">
        <input id="sub-consent" name="consent" type="checkbox" className="mt-1" />
        <span>
          Quiero recibir un aviso cuando haya obra nueva. Nada más: ni
          promociones ni terceros. Puedo darme de baja desde cualquier correo.
        </span>
      </label>

      {/* Trampa para bots: invisible y fuera del orden de tabulación. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px"
      />

      <div>
        <Enviar />
      </div>
    </form>
  );
}
