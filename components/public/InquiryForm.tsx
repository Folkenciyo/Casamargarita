"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { diccionario, type Idioma } from "@/lib/i18n/dictionaries";
import { sendInquiry, type InquiryState } from "@/lib/public/actions";

const field =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

function Submit({ enviar, enviando }: { enviar: string; enviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? enviando : enviar}
    </button>
  );
}

export function InquiryForm({
  paintingId,
  lang = "es",
}: {
  paintingId: string;
  lang?: Idioma;
}) {
  const t = diccionario(lang);
  const [state, formAction] = useActionState<InquiryState, FormData>(
    sendInquiry.bind(null, paintingId),
    {},
  );

  if (state.ok) {
    return (
      <p role="status" className="rounded bg-green-50 p-4 text-green-900">
        {lang === "en"
          ? "Enquiry sent. The artist will reply to the address you gave."
          : "Consulta enviada. La artista te responderá al correo que has indicado."}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      {state.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className="block text-sm" htmlFor="name">
          {t.formulario.nombre}
        </label>
        <input id="name" name="name" required className={field} />
      </div>

      <div>
        <label className="block text-sm" htmlFor="email">
          {t.formulario.correo}
        </label>
        <input id="email" name="email" type="email" required className={field} />
      </div>

      <div>
        <label className="block text-sm" htmlFor="message">
          {t.formulario.mensaje}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          minLength={10}
          className={field}
        />
      </div>

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
        <Submit
          enviar={t.formulario.enviar}
          enviando={t.formulario.enviando}
        />
      </div>
    </form>
  );
}
