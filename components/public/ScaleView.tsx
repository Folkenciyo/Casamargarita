"use client";

import { useState } from "react";
import { formatDimensions } from "@/lib/catalog";
import { diccionario, type Idioma } from "@/lib/i18n/dictionaries";
import {
  PERSONA,
  REFERENCIAS,
  bordeInferiorCm,
  proporciones,
  referenciaPorId,
} from "@/lib/scale";

type Props = {
  anchoCm: number;
  altoCm: number;
  titulo: string;
  imagenUrl: string | null;
  lang?: Idioma;
};

/**
 * «¿Cómo de grande es en realidad?» es la pregunta que más se repite al
 * comprar arte por internet. Aquí se responde poniendo la obra al lado de algo
 * cuyo tamaño ya conoce todo el mundo, a la altura a la que se colgaría.
 *
 * Todo el dibujo es CSS y porcentajes: no hay lienzo, no hay imágenes de
 * apoyo y funciona igual en un móvil que en una pantalla grande.
 */
export function ScaleView({ anchoCm, altoCm, titulo, imagenUrl, lang = "es" }: Props) {
  const [referenciaId, setReferenciaId] = useState(PERSONA.id);
  const referencia = referenciaPorId(referenciaId);
  const t = diccionario(lang);

  const nombreReferencia: Record<string, string> = {
    persona: t.obra.unaPersona,
    sofa: t.obra.unSofa,
    puerta: t.obra.unaPuerta,
  };

  const medidas = proporciones({
    obraAnchoCm: anchoCm,
    obraAltoCm: altoCm,
    referencia,
  });
  const bordeInferior = (bordeInferiorCm(altoCm) / medidas.masAltoCm) * 100;

  return (
    <section aria-labelledby="escala" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="escala" className="display text-2xl">
          {t.obra.aTamanoReal}
        </h2>
        <div className="flex gap-1" role="group" aria-label="Comparar con">
          {REFERENCIAS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setReferenciaId(opcion.id)}
              aria-pressed={opcion.id === referenciaId}
              className={
                opcion.id === referenciaId
                  ? "rounded-full bg-[color:var(--color-ink)] px-3 py-1 text-xs text-[color:var(--color-canvas)]"
                  : "rounded-full border border-[color:var(--color-canvas-dim)] px-3 py-1 text-xs"
              }
            >
              {nombreReferencia[opcion.id] ?? opcion.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Todas las medidas se calculan contra --escena, la altura del cuadro
          de dibujo. Usar porcentajes para el ancho los resolvería contra el
          ancho del contenedor y deformaría las proporciones reales. */}
      <div
        className="relative overflow-hidden rounded border border-[color:var(--color-canvas-dim)] bg-[color:var(--color-canvas-dim)]/40 [--escena:18rem] sm:[--escena:24rem]"
        style={{ height: "var(--escena)" }}
      >
        {/* Línea de suelo: sin ella los objetos flotarían y se perdería la escala. */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-[color:var(--color-ink-soft)]/40" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[8%] px-[6%]">
          {/* La referencia, dibujada como silueta: reconocible sin distraer. */}
          <div
            className="relative shrink-0"
            style={{
              height: `calc(var(--escena) * ${medidas.referenciaAltoPct / 100})`,
              width: `calc(var(--escena) * ${medidas.referenciaAnchoPct / 100})`,
            }}
            aria-hidden="true"
          >
            <Silueta tipo={referencia.id} />
          </div>

          {/* La obra, a su altura de colgado. */}
          <div
            className="relative shrink-0"
            style={{
              height: `calc(var(--escena) * ${medidas.obraAltoPct / 100})`,
              width: `calc(var(--escena) * ${medidas.obraAnchoPct / 100})`,
              marginBottom: `calc(var(--escena) * ${bordeInferior / 100})`,
            }}
          >
            <div className="impasto h-full w-full border border-[color:var(--color-ink)]/15 bg-[color:var(--color-canvas)] shadow-sm">
              {imagenUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imagenUrl}
                  alt={`${titulo}, a escala`}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-[color:var(--color-ink-soft)]">
        {t.obra.escalaPie(
          formatDimensions(anchoCm, altoCm),
          nombreReferencia[referencia.id] ?? referencia.nombre,
          referencia.altoCm,
        )}
      </p>
    </section>
  );
}

/** Siluetas mínimas: lo justo para reconocer qué son de un vistazo. */
function Silueta({ tipo }: { tipo: string }) {
  const relleno = "var(--color-ink-soft)";

  if (tipo === "sofa") {
    return (
      <svg viewBox="0 0 200 85" className="h-full w-full" preserveAspectRatio="none">
        <path
          d="M4 40h192v38a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7Zm12-22a8 8 0 0 1 8-8h152a8 8 0 0 1 8 8v22h-14V32H30v8H16Z"
          fill={relleno}
          opacity="0.45"
        />
      </svg>
    );
  }

  if (tipo === "puerta") {
    return (
      <svg viewBox="0 0 72 203" className="h-full w-full" preserveAspectRatio="none">
        <rect x="0" y="0" width="72" height="203" fill={relleno} opacity="0.28" />
        <rect x="6" y="6" width="60" height="191" fill="none" stroke={relleno} strokeWidth="2" opacity="0.6" />
        <circle cx="58" cy="105" r="3" fill={relleno} opacity="0.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 45 170" className="h-full w-full" preserveAspectRatio="none">
      <circle cx="22.5" cy="14" r="12" fill={relleno} opacity="0.45" />
      <path
        d="M10 30h25a7 7 0 0 1 7 7v45a5 5 0 0 1-5 5h-2v78h-9v-46h-7v46h-9V87H8a5 5 0 0 1-5-5V37a7 7 0 0 1 7-7Z"
        fill={relleno}
        opacity="0.45"
      />
    </svg>
  );
}
