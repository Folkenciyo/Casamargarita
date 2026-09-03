"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteImage,
  generatePaintingDetails,
  moveImage,
  regenerateDetailImage,
  reorderImages,
  setPrimaryImage,
  updateImageAlt,
  type ActionState,
} from "@/lib/admin/actions";
import {
  DETAIL_COUNT,
  DETAIL_MIN_SOURCE_PX,
  canGenerateDetails,
} from "@/lib/images/details";
import { imageUrl } from "@/lib/images/urls";
import { MultiUpload } from "./MultiUpload";

type ImageItem = {
  id: string;
  basePath: string;
  widths: number[];
  width: number;
  height: number;
  isPrimary: boolean;
  isDetail: boolean;
  alt: string | null;
};

function BotonRegenerar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm underline disabled:opacity-50"
      aria-label="Recortar este detalle de nuevo, en otra zona de la principal"
    >
      {pending ? "Recortando…" : "Regenerar"}
    </button>
  );
}

function BotonDetalles() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-[color:var(--color-ink)] px-4 py-2 text-sm disabled:opacity-50"
    >
      {pending ? "Recortando…" : `Generar ${DETAIL_COUNT} fotos de detalle`}
    </button>
  );
}

/**
 * Atajo para sacar detalles de la foto principal cuando no hay tomas cercanas.
 *
 * El botón solo se ofrece si la foto da resolución de sobra: por debajo de eso
 * el recorte enseña píxeles ampliados y no pincelada. Cuando no llega se dice,
 * en vez de esconder el botón sin más: quien no ve una opción no puede
 * adivinar que existe ni qué le falta para tenerla.
 */
function GenerarDetalles({
  paintingId,
  principal,
}: {
  paintingId: string;
  principal: ImageItem | undefined;
}) {
  const [estado, formAction] = useActionState<ActionState, FormData>(
    generatePaintingDetails.bind(null, paintingId),
    {},
  );

  if (!principal) return null;

  if (!canGenerateDetails(principal.width, principal.height)) {
    return (
      <p className="mb-6 max-w-md text-sm text-[color:var(--color-ink-soft)]">
        Las fotos de detalle se recortan de la principal, y esta es de{" "}
        {principal.width}×{principal.height} px: hacen falta{" "}
        {DETAIL_MIN_SOURCE_PX} px por el lado corto para que el recorte no salga
        blando. Súbela más grande, o haz las tomas de cerca con la cámara.
      </p>
    );
  }

  return (
    <form action={formAction} className="mb-6 grid gap-2 sm:max-w-md">
      {estado.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {estado.error}
        </p>
      ) : null}
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        ¿Sin fotos de cerca? Se pueden recortar de la principal. Salen como
        fotos normales: se borran y se reordenan igual que las demás.
      </p>
      <div>
        <BotonDetalles />
      </div>
    </form>
  );
}

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

      <GenerarDetalles
        paintingId={paintingId}
        principal={images.find((imagen) => imagen.isPrimary) ?? images[0]}
      />

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

            <div className="flex gap-3">
              {image.isDetail ? (
                <form action={regenerateDetailImage.bind(null, image.id)}>
                  <BotonRegenerar />
                </form>
              ) : null}

              <form action={deleteImage.bind(null, image.id)}>
                <button type="submit" className="text-sm text-red-700 underline">
                  Borrar
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
