"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";

const campo =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";
const etiqueta = "block text-sm font-medium";

function Enviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : texto}
    </button>
  );
}

export function JournalForm({
  action,
  texto,
  valores,
  obras,
}: {
  action: (estado: ActionState, formData: FormData) => Promise<ActionState>;
  texto: string;
  valores?: {
    title: string;
    summary: string;
    body: string;
    published: boolean;
    publishedAt: string;
    paintingId: string | null;
  };
  obras: { id: string; title: string }[];
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
        <label className={etiqueta} htmlFor="title">
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={valores?.title}
          placeholder="Cómo se hizo «Marina al alba»"
          className={campo}
        />
      </div>

      <div>
        <label className={etiqueta} htmlFor="summary">
          Entradilla
        </label>
        <input
          id="summary"
          name="summary"
          maxLength={500}
          defaultValue={valores?.summary}
          placeholder="Lo que se lee en el listado y al compartir el enlace."
          className={campo}
        />
      </div>

      <div>
        <label className={etiqueta} htmlFor="body">
          Texto
        </label>
        <textarea
          id="body"
          name="body"
          rows={16}
          maxLength={20000}
          defaultValue={valores?.body}
          placeholder="Escríbelo como escribirías un correo. Los saltos de línea se respetan."
          className={campo}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={etiqueta} htmlFor="publishedAt">
            Fecha
          </label>
          <input
            id="publishedAt"
            name="publishedAt"
            type="date"
            defaultValue={valores?.publishedAt}
            className={campo}
          />
        </div>
        <div>
          <label className={etiqueta} htmlFor="paintingId">
            Obra de la que habla
          </label>
          <select
            id="paintingId"
            name="paintingId"
            defaultValue={valores?.paintingId ?? ""}
            className={campo}
          >
            <option value="">Ninguna en concreto</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2" htmlFor="published">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={valores?.published ?? false}
        />
        Publicada
        <span className="text-sm text-[color:var(--color-ink-soft)]">
          sin marcar queda como borrador, solo visible aquí
        </span>
      </label>

      <div>
        <Enviar texto={texto} />
      </div>
    </form>
  );
}
