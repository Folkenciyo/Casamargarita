"use client";

import { useEffect, useRef, useState } from "react";
import { reorderFeaturedPaintings } from "@/lib/admin/actions";
import { imageUrl } from "@/lib/images/urls";

type ObraDestacada = {
  id: string;
  title: string;
  basePath: string | null;
};

/**
 * Orden de las obras destacadas en portada, aparte del orden de /galeria
 * (ver `featuredPosition` en el schema). Mismo arrastrar-y-soltar que
 * `ImageManager` para las fotos de una obra, mismo motivo: es lo que se
 * quiere mirar mientras se reordena, no un formulario aparte.
 */
export function FeaturedOrder({ paintings }: { paintings: ObraDestacada[] }) {
  const [orden, setOrden] = useState(paintings);
  const arrastrado = useRef<number | null>(null);

  useEffect(() => {
    setOrden(paintings);
  }, [paintings]);

  function soltarSobre(destino: number) {
    const origen = arrastrado.current;
    arrastrado.current = null;
    if (origen === null || origen === destino) return;

    const siguiente = [...orden];
    const [movida] = siguiente.splice(origen, 1);
    if (!movida) return;
    siguiente.splice(destino, 0, movida);

    setOrden(siguiente);
    void reorderFeaturedPaintings(siguiente.map((obra) => obra.id));
  }

  if (orden.length < 2) return null;

  return (
    <section className="mb-6 rounded border border-[color:var(--color-canvas-dim)] bg-white p-4">
      <h2 className="mb-1 text-sm font-medium">Orden en portada</h2>
      <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
        Arrastra para cambiar el orden de las destacadas. Solo afecta a la
        portada: la galería sigue su propio orden. Se ven como mucho las 7
        primeras.
      </p>

      <ul aria-label="Orden de las destacadas" className="flex flex-wrap gap-3">
        {orden.map((obra, index) => (
          <li
            key={obra.id}
            draggable
            onDragStart={() => {
              arrastrado.current = index;
            }}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => soltarSobre(index)}
            onDragEnd={() => {
              arrastrado.current = null;
            }}
            className="flex w-28 cursor-grab flex-col gap-1 active:cursor-grabbing"
          >
            <div className="relative h-20 w-full overflow-hidden rounded bg-[color:var(--color-canvas-dim)]">
              {obra.basePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(obra.basePath, 400, "webp")}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              <span
                aria-hidden
                className="tabular absolute top-1 left-1 rounded-full bg-[color:var(--color-ink)] px-1.5 py-0.5 text-xs text-[color:var(--color-canvas)]"
              >
                {index + 1}
              </span>
            </div>
            <span className="truncate text-xs">{obra.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
