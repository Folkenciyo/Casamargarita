"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteArtistPortrait,
  uploadArtistPortrait,
  type ActionState,
} from "@/lib/admin/actions";
import { imageUrl } from "@/lib/images/urls";

type Portrait = {
  path: string;
  widths: number[];
} | null;

function UploadButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Procesando…" : label}
    </button>
  );
}

export function PortraitManager({ portrait }: { portrait: Portrait }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    uploadArtistPortrait,
    {},
  );

  return (
    <section>
      <h2 className="mb-4 display text-xl">Retrato</h2>

      {portrait ? (
        <div className="mb-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(portrait.path, portrait.widths[0] ?? 400, "webp")}
            alt=""
            className="h-24 w-24 rounded object-cover"
          />
          <form action={deleteArtistPortrait}>
            <button type="submit" className="text-sm text-red-700 underline">
              Quitar retrato
            </button>
          </form>
        </div>
      ) : (
        <p className="mb-4 text-sm text-[color:var(--color-ink-soft)]">
          Todavía no hay retrato. Se muestra en la ficha pública de la artista.
        </p>
      )}

      <form action={formAction} className="grid gap-3 sm:max-w-md">
        {state.error ? (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
            {state.error}
          </p>
        ) : null}

        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          required
          aria-label="Fichero de retrato"
        />
        <div>
          <UploadButton label={portrait ? "Cambiar retrato" : "Subir retrato"} />
        </div>
      </form>
    </section>
  );
}
