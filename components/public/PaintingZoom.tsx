"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imageUrl, largestWidth } from "@/lib/images/urls";

type Props = {
  basePath: string;
  widths: number[];
  alt: string;
  children: React.ReactNode;
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const PASO_RUEDA = 0.0018;

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Visor de detalle: envuelve la obra y, al pulsarla, la abre a pantalla
 * completa con la variante más grande que exista para poder acercarse a la
 * pincelada.
 *
 * Es lo primero que hace quien se plantea comprar un óleo, y una foto plana
 * es justo lo que no lo deja hacer.
 *
 * La imagen grande no se pide hasta que alguien abre el visor: quien solo
 * pasa por la ficha no descarga varios megas por si acaso.
 */
export function PaintingZoom({ basePath, widths, alt, children }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [origen, setOrigen] = useState({ x: 50, y: 50 });
  const [cargada, setCargada] = useState(false);
  const arrastrando = useRef(false);
  const cerrar = useRef<HTMLButtonElement>(null);

  const urlDetalle = imageUrl(basePath, largestWidth(widths), "webp");

  const cerrarVisor = useCallback(() => {
    setAbierto(false);
    setZoom(2);
    setOrigen({ x: 50, y: 50 });
  }, []);

  // Escape cierra y el fondo deja de desplazarse mientras el visor está
  // abierto: si no, al cerrar apareces en otro punto de la página.
  useEffect(() => {
    if (!abierto) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarVisor();
      if (evento.key === "+" || evento.key === "=") {
        setZoom((actual) => acotar(actual + 0.5, ZOOM_MIN, ZOOM_MAX));
      }
      if (evento.key === "-") {
        setZoom((actual) => acotar(actual - 0.5, ZOOM_MIN, ZOOM_MAX));
      }
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alPulsarTecla);
    cerrar.current?.focus();

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alPulsarTecla);
    };
  }, [abierto, cerrarVisor]);

  /** Mueve el punto de origen del zoom con el ratón o el dedo. */
  const seguir = (evento: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando.current && evento.pointerType !== "mouse") return;
    const caja = evento.currentTarget.getBoundingClientRect();
    setOrigen({
      x: acotar(((evento.clientX - caja.left) / caja.width) * 100, 0, 100),
      y: acotar(((evento.clientY - caja.top) / caja.height) * 100, 0, 100),
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Ver ${alt} de cerca`}
        className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-[color:var(--color-ink)]/75 px-3 py-1 text-xs text-[color:var(--color-canvas)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          Ver la pincelada
        </span>
      </button>

      {abierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt}, vista de detalle`}
          className="fixed inset-0 z-50 flex flex-col bg-[color:var(--color-ink)]"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-[color:var(--color-canvas)]">
            <p className="truncate text-sm">{alt}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => acotar(z - 0.5, ZOOM_MIN, ZOOM_MAX))}
                aria-label="Alejar"
                className="h-9 w-9 rounded-full border border-[color:var(--color-canvas)]/30 text-lg"
              >
                −
              </button>
              <span className="tabular w-14 text-center text-sm">
                {zoom.toFixed(1)}×
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => acotar(z + 0.5, ZOOM_MIN, ZOOM_MAX))}
                aria-label="Acercar"
                className="h-9 w-9 rounded-full border border-[color:var(--color-canvas)]/30 text-lg"
              >
                +
              </button>
              <button
                ref={cerrar}
                type="button"
                onClick={cerrarVisor}
                className="ml-2 rounded border border-[color:var(--color-canvas)]/30 px-3 py-1.5 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div
            className="flex-1 touch-none overflow-hidden"
            style={{ cursor: zoom > 1 ? "grab" : "default" }}
            onPointerDown={(evento) => {
              arrastrando.current = true;
              evento.currentTarget.setPointerCapture(evento.pointerId);
              seguir(evento);
            }}
            onPointerUp={() => {
              arrastrando.current = false;
            }}
            onPointerMove={seguir}
            onWheel={(evento) => {
              setZoom((actual) =>
                acotar(actual - evento.deltaY * PASO_RUEDA, ZOOM_MIN, ZOOM_MAX),
              );
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlDetalle}
              alt={alt}
              onLoad={() => setCargada(true)}
              className="h-full w-full object-contain transition-opacity duration-300"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${origen.x}% ${origen.y}%`,
                opacity: cargada ? 1 : 0,
              }}
            />
          </div>

          <p className="px-4 pb-3 text-center text-xs text-[color:var(--color-canvas)]/60">
            Arrastra para recorrer la superficie · rueda o + y − para acercar ·
            Escape para cerrar
          </p>
        </div>
      ) : null}
    </>
  );
}
