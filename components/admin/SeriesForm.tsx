"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";

const campo =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

function Enviar({ etiqueta }: { etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : etiqueta}
    </button>
  );
}

export function SeriesForm({
  action,
  etiqueta,
  valores,
}: {
  action: (estado: ActionState, formData: FormData) => Promise<ActionState>;
  etiqueta: string;
  valores?: { title: string; description: string; published: boolean };
}) {
  const [estado, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      {estado.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {estado.error}
        </p>
      ) : null}
      {estado.ok ? (
        <p role="status" className="rounded bg-green-50 p-3 text-green-800">
          Cambios guardados.
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium" htmlFor="title">
          Título de la serie
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={valores?.title}
          placeholder="Marinas de invierno"
          className={campo}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="description">
          De qué va
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          maxLength={4000}
          defaultValue={valores?.description}
          placeholder="Qué une a estas obras: un lugar, una temporada, una manera de mirar."
          className={campo}
        />
      </div>

      <label className="flex items-center gap-2" htmlFor="published">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={valores?.published ?? true}
        />
        Visible en la web
      </label>

      <div>
        <Enviar etiqueta={etiqueta} />
      </div>
    </form>
  );
}
