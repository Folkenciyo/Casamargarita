"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteImage,
  moveImage,
  setPrimaryImage,
  updateImageAlt,
  uploadPaintingImage,
  type ActionState,
} from "@/lib/admin/actions";
import { imageUrl } from "@/lib/images/urls";

type ImageItem = {
  id: string;
  basePath: string;
  widths: number[];
  isPrimary: boolean;
  alt: string | null;
};

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Procesando…" : "Subir foto"}
    </button>
  );
}

export function ImageManager({
  paintingId,
  images,
}: {
  paintingId: string;
  images: ImageItem[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    uploadPaintingImage.bind(null, paintingId),
    {},
  );

  return (
    <section>
      <h2 className="mb-4 display text-xl">
        Fotos ({images.length})
      </h2>

      <form action={formAction} className="mb-6 grid gap-3 sm:max-w-md">
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
          aria-label="Fichero de imagen"
        />
        <input
          type="text"
          name="alt"
          placeholder="Descripción para lectores de pantalla (opcional)"
          className="rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
        <div>
          <UploadButton />
        </div>
      </form>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id} className="grid min-w-0 gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(image.basePath, image.widths[0] ?? 400, "webp")}
              alt={image.alt ?? ""}
              className="aspect-square w-full rounded object-cover"
            />

            <form
              action={updateImageAlt.bind(null, image.id)}
              className="flex min-w-0 gap-1"
            >
              <input
                type="text"
                name="alt"
                defaultValue={image.alt ?? ""}
                placeholder="Descripción"
                aria-label={`Descripción de la foto ${index + 1}`}
                className="min-w-0 flex-1 rounded border border-[color:var(--color-canvas-dim)] bg-white px-2 py-1 text-sm"
              />
              <button type="submit" className="shrink-0 text-sm underline">
                Guardar
              </button>
            </form>

            {image.isPrimary ? (
              <span className="text-sm text-[color:var(--color-ink-soft)]">
                Principal
              </span>
            ) : (
              <form action={setPrimaryImage.bind(null, image.id)}>
                <button type="submit" className="text-sm underline">
                  Hacer principal
                </button>
              </form>
            )}

            <div className="flex gap-1">
              <form action={moveImage.bind(null, image.id, "up")}>
                <button
                  type="submit"
                  aria-label={`Adelantar foto ${index + 1}`}
                  className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1"
                >
                  ↑
                </button>
              </form>
              <form action={moveImage.bind(null, image.id, "down")}>
                <button
                  type="submit"
                  aria-label={`Atrasar foto ${index + 1}`}
                  className="rounded border border-[color:var(--color-canvas-dim)] px-2 py-1"
                >
                  ↓
                </button>
              </form>
            </div>

            <form action={deleteImage.bind(null, image.id)}>
              <button type="submit" className="text-sm text-red-700 underline">
                Borrar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
