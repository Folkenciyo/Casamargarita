"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateArtist, type ActionState } from "@/lib/admin/actions";

const field =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function ArtistForm({
  values,
}: {
  values: {
    name: string;
    statement: string;
    bio: string;
    email: string;
    instagram: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateArtist,
    {},
  );

  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="rounded bg-green-50 p-3 text-green-800">
          Ficha guardada.
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={values.name}
          className={field}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="statement">
          Frase de portada
        </label>
        <input
          id="statement"
          name="statement"
          maxLength={400}
          defaultValue={values.statement}
          className={field}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="bio">
          Biografía
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={12}
          maxLength={8000}
          defaultValue={values.bio}
          className={field}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Correo de contacto
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email}
            className={field}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="instagram">
            Instagram
          </label>
          <input
            id="instagram"
            name="instagram"
            placeholder="@usuario"
            defaultValue={values.instagram}
            className={field}
          />
        </div>
      </div>

      <div>
        <Submit />
      </div>
    </form>
  );
}
