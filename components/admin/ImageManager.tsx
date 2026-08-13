"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteImage,
  moveImage,
  reorderImages,
  setPrimaryImage,
  updateImageAlt,
} from "@/lib/admin/actions";
import { imageUrl } from "@/lib/images/urls";
import { MultiUpload } from "./MultiUpload";

type ImageItem = {
  id: string;
  basePath: string;
  widths: number[];
  isPrimary: boolean;
  alt: string | null;
};

export function ImageManager({
  paintingId,
  images,
}: {
  paintingId: string;
  images: ImageItem[];
}) {
  // Copia local para que el arrastre se vea al instante, sin esperar al
  // servidor. Se resincroniza cuando llega el orden ya guardado.
  const [orden, setOrden] = useState(images);
  const arrastrado = useRef<number | null>(null);

  useEffect(() => {
    setOrden(images);
  }, [images]);

  function soltarSobre(destino: number) {
    const origen = arrastrado.current;
    arrastrado.current = null;
    if (origen === null || origen === destino) return;

    const siguiente = [...orden];
    const [movida] = siguiente.splice(origen, 1);
    if (!movida) return;
    siguiente.splice(destino, 0, movida);

    setOrden(siguiente);
    void reorderImages(
      paintingId,
      siguiente.map((imagen) => imagen.id),
    );
  }

  return (
    <section>
      <h2 className="mb-4 display text-xl">
        Fotos ({images.length})
      </h2>

      <MultiUpload paintingId={paintingId} />

      {orden.length > 1 ? (
        <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
          Arrastra las fotos para cambiar su orden. Las flechas hacen lo mismo
          desde el teclado.
        </p>
      ) : null}

      {/* Con nombre: en esta pantalla hay otra lista, la del progreso de la
          subida, y sin distinguirlas se confunden lector de pantalla y tests. */}
      <ul
        aria-label="Fotos de la obra"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {orden.map((image, index) => (
          <li
            key={image.id}
            draggable
            onDragStart={() => {
              arrastrado.current = index;
            }}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => soltarSobre(index)}
            onDragEnd={() => {
              arrastrado.current = null;
            }}
            className="grid min-w-0 cursor-grab gap-2 active:cursor-grabbing"
          >
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
