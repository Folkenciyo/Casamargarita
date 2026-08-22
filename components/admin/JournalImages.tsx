"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";
import {
  deleteJournalImage,
  updateJournalCaption,
  uploadJournalImage,
} from "@/lib/admin/journal-actions";
import { tooLargeMessage } from "@/lib/images/limits";
import { imageUrl } from "@/lib/images/urls";

type Foto = {
  id: string;
  basePath: string;
  widths: number[];
  alt: string | null;
  caption: string;
};

function Subir({ bloqueado }: { bloqueado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || bloqueado}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Procesando…" : "Añadir foto"}
    </button>
  );
}

/**
 * Fotos del proceso. Se suben de una en una a propósito, al revés que en la
 * ficha de obra: aquí el pie de foto es lo importante —"primera mancha",
 * "veladuras"— y se escribe en el momento, mientras se recuerda cuál era cuál.
 */
export function JournalImages({
  entryId,
  images,
}: {
  entryId: string;
  images: Foto[];
}) {
  const [estado, formAction] = useActionState<ActionState, FormData>(
    uploadJournalImage.bind(null, entryId),
    {},
  );
  // Se avisa al elegir el fichero y no al enviarlo: así nadie espera a que
  // suban veinte megas para enterarse de que no caben.
  const [demasiado, setDemasiado] = useState<string | null>(null);

  return (
    <section>
      <h2 className="display mb-4 text-xl">Fotos del proceso ({images.length})</h2>

      <form action={formAction} className="mb-8 grid gap-3 sm:max-w-md">
        {(demasiado ?? estado.error) ? (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
            {demasiado ?? estado.error}
          </p>
        ) : null}

        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          required
          aria-label="Foto del proceso"
          onChange={(evento) => {
            const fichero = evento.target.files?.[0];
            setDemasiado(fichero ? tooLargeMessage(fichero.size) : null);
          }}
        />
        <input
          type="text"
          name="caption"
          placeholder="Pie de foto: primera mancha, veladuras…"
          className="rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
        <div>
          <Subir bloqueado={demasiado !== null} />
        </div>
      </form>

      {images.length === 0 ? (
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Se muestran en la web en el orden en que se suben.
        </p>
      ) : (
        <ul aria-label="Fotos de la entrada" className="grid gap-4">
          {images.map((foto, indice) => (
            <li
              key={foto.id}
              className="flex flex-wrap items-start gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(foto.basePath, foto.widths[0] ?? 400, "webp")}
                alt={foto.alt ?? ""}
                className="h-24 w-24 shrink-0 rounded object-cover"
              />

              <form
                action={updateJournalCaption.bind(null, foto.id)}
                className="grid min-w-0 flex-1 gap-2"
              >
                <input
                  type="text"
                  name="caption"
                  defaultValue={foto.caption}
                  placeholder="Pie de foto"
                  aria-label={`Pie de la foto ${indice + 1}`}
                  className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  name="alt"
                  defaultValue={foto.alt ?? ""}
                  placeholder="Descripción para lectores de pantalla"
                  aria-label={`Descripción de la foto ${indice + 1}`}
                  className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1 text-sm"
                />
                <div>
                  <button type="submit" className="text-sm underline">
                    Guardar
                  </button>
                </div>
              </form>

              <form action={deleteJournalImage.bind(null, foto.id)}>
                <button type="submit" className="text-sm text-red-700 underline">
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
