"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteArtistPortrait,
  uploadArtistPortrait,
  type ActionState,
} from "@/lib/admin/actions";
import { tooLargeMessage } from "@/lib/images/limits";
import { imageUrl } from "@/lib/images/urls";

type Portrait = {
  path: string;
  widths: number[];
} | null;

function UploadButton({ label, bloqueado }: { label: string; bloqueado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || bloqueado}
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
  // Igual que en las fotos de obra y del diario: el aviso llega al elegir el
  // fichero, no después de haberlo subido entero.
  const [demasiado, setDemasiado] = useState<string | null>(null);

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
        {(demasiado ?? state.error) ? (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
            {demasiado ?? state.error}
          </p>
        ) : null}

        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          required
          aria-label="Fichero de retrato"
          onChange={(evento) => {
            const fichero = evento.target.files?.[0];
            setDemasiado(fichero ? tooLargeMessage(fichero.size) : null);
          }}
        />
        <div>
          <UploadButton
            label={portrait ? "Cambiar retrato" : "Subir retrato"}
            bloqueado={demasiado !== null}
          />
        </div>
      </form>
    </section>
  );
}
