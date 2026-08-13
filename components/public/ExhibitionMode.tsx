"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { imageUrl, responsiveWidths, srcSet } from "@/lib/images/urls";

export type ObraExpuesta = {
  slug: string;
  title: string;
  year: number | null;
  etiqueta: string;
  medidas: string;
  imagen: {
    basePath: string;
    widths: number[];
    alt: string;
  } | null;
};

/**
 * Sala de exposición: fondo oscuro, una obra cada vez y las flechas del
 * teclado. La sala en 3D es para quien quiere pasear; esto es para quien solo
 * quiere mirar, y funciona en cualquier pantalla y sin GPU.
 *
 * La cartela se lee como la de una pared: título, año, medidas y estado.
 */
export function ExhibitionMode({
  obras,
  etiqueta = "Modo exposición",
}: {
  obras: ObraExpuesta[];
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);

  const total = obras.length;
  const mover = useCallback(
    (paso: number) => setIndice((actual) => (actual + paso + total) % total),
    [total],
  );

  useEffect(() => {
    if (!abierto) return;

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
      if (evento.key === "ArrowRight" || evento.key === " ") {
        evento.preventDefault();
        mover(1);
      }
      if (evento.key === "ArrowLeft") mover(-1);
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alPulsar);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alPulsar);
    };
  }, [abierto, mover]);

  // El índice da la vuelta con el módulo, pero eso TypeScript no lo sabe: si
  // alguna vez apuntara fuera, se vuelve a la primera en lugar de romper.
  const obra = obras[indice] ?? obras[0];
  if (!obra) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndice(0);
          setAbierto(true);
        }}
        className="text-sm underline"
      >
        {etiqueta}
      </button>

      {abierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exposición a pantalla completa"
          className="fixed inset-0 z-50 flex flex-col bg-[#0e0c0a]"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <span className="tabular text-xs tracking-[0.2em] text-white/40 uppercase">
              {indice + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded border border-white/25 px-3 py-1.5 text-sm text-white/80"
            >
              Cerrar
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Obra anterior"
              className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              ‹
            </button>

            {obra.imagen ? (
              <picture>
                <source
                  type="image/avif"
                  srcSet={srcSet(
                    obra.imagen.basePath,
                    responsiveWidths(obra.imagen.widths),
                    "avif",
                  )}
                  sizes="90vw"
                />
                <img
                  src={imageUrl(
                    obra.imagen.basePath,
                    responsiveWidths(obra.imagen.widths).at(-1) ?? 800,
                    "webp",
                  )}
                  alt={obra.imagen.alt}
                  className="max-h-[70vh] w-auto max-w-full object-contain shadow-2xl"
                />
              </picture>
            ) : (
              <div className="h-64 w-48 bg-white/5" />
            )}

            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Obra siguiente"
              className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              ›
            </button>
          </div>

          {/* Cartela, como en la pared de una sala. */}
          <div className="px-6 pt-4 pb-8 text-center">
            <h2 className="display text-2xl text-white">
              {obra.title}
              {obra.year ? (
                <span className="text-white/50 italic">, {obra.year}</span>
              ) : null}
            </h2>
            <p className="tabular mt-1 text-sm text-white/50">
              {obra.medidas}
              <span className="mx-2 opacity-40">·</span>
              {obra.etiqueta}
            </p>
            <Link
              href={`/obra/${obra.slug}`}
              className="mt-3 inline-block text-sm text-white/70 underline"
            >
              Ver la ficha completa
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
