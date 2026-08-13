"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/catalog";
import { diccionario, type Idioma } from "@/lib/i18n/dictionaries";
import {
  ZONAS,
  ZONA_ETIQUETAS,
  presupuestoEnvio,
  type Zona,
} from "@/lib/shipping";

const ZONA_EN: Record<Zona, string> = {
  peninsula: "Mainland Spain",
  baleares: "Balearic Islands",
  canarias: "Canary Islands, Ceuta and Melilla",
  europa: "European Union",
  resto: "Rest of the world",
};

/**
 * Presupuesto orientativo de envío, calculado en el navegador a partir de las
 * medidas de la obra. Sin llamadas al servidor: son cuatro tarifas.
 *
 * Se insiste en que es orientativo, y por qué: dar una cifra cerrada que
 * luego no se cumple es peor que no darla.
 */
export function ShippingEstimate({
  anchoCm,
  altoCm,
  lang = "es",
}: {
  anchoCm: number;
  altoCm: number;
  lang?: Idioma;
}) {
  const [zona, setZona] = useState<Zona>("peninsula");
  const presupuesto = presupuestoEnvio({ anchoCm, altoCm, zona });
  const ingles = lang === "en";
  const t = diccionario(lang);

  return (
    <section className="mt-10 rounded border border-[color:var(--color-canvas-dim)] p-5">
      <h2 className="display mb-1 text-xl">
        {ingles ? "Packing and shipping" : "Embalaje y envío"}
      </h2>
      <p className="mb-4 text-sm text-[color:var(--color-ink-soft)]">
        {ingles
          ? "Rough estimate, so you know the order of magnitude before writing."
          : "Cálculo orientativo, para que sepas el orden de magnitud antes de escribir."}
      </p>

      <label className="block text-sm" htmlFor="zona-envio">
        {ingles ? "Where to" : "A dónde"}
      </label>
      <select
        id="zona-envio"
        value={zona}
        onChange={(evento) => setZona(evento.target.value as Zona)}
        className="mt-1 w-full max-w-xs rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
      >
        {ZONAS.map((opcion) => (
          <option key={opcion} value={opcion}>
            {ingles ? ZONA_EN[opcion] : ZONA_ETIQUETAS[opcion]}
          </option>
        ))}
      </select>

      <p className="mt-4">
        {presupuesto.tipo === "tarifa" ? (
          <>
            <span className="display text-2xl">
              {formatPrice(
                presupuesto.centimos,
                "EUR",
                ingles ? "en-GB" : "es-ES",
                t.precioAConsultar,
              )}
            </span>
            <span className="ml-2 text-sm text-[color:var(--color-ink-soft)]">
              {ingles
                ? "including rigid packing"
                : "con embalaje rígido incluido"}
            </span>
          </>
        ) : (
          <span className="text-[color:var(--color-ink-soft)]">
            {ingles
              ? "Over 150 cm shipping goes by special transport: ask and it will be quoted."
              : presupuesto.motivo + " Pregunta y se te cotiza."}
          </span>
        )}
      </p>

      <p className="mt-3 text-xs text-[color:var(--color-ink-soft)]">
        {ingles
          ? "Final price is confirmed by email before anything ships. Framed work is quoted separately."
          : "El precio final se confirma por correo antes de enviar nada. La obra enmarcada se cotiza aparte."}
      </p>
    </section>
  );
}
