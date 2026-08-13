"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IDIOMAS, type Idioma } from "@/lib/i18n/dictionaries";

const NOMBRES: Record<Idioma, string> = { es: "ES", en: "EN" };

/**
 * Cambia de idioma quedándose donde estás.
 *
 * Solo se ofrece el cambio en las páginas que existen en los dos idiomas
 * —galería y ficha de obra—: mandar a alguien desde el diario en español a
 * una portada en inglés es perderlo, no traducirlo.
 */
export function LanguageSwitch() {
  const pathname = usePathname();
  // El idioma sale de la ruta y no de una prop: el layout es el mismo para
  // los dos, así que pasárselo desde arriba siempre diría "es".
  const actual: Idioma = pathname.startsWith("/en") ? "en" : "es";

  /** Misma página, otro idioma; si no existe en el otro, su portada. */
  function equivalente(destino: Idioma): string {
    if (destino === actual) return pathname;

    const sinPrefijo = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    const traducible = /^\/(galeria(\/.*)?|obra\/.+)?$/.test(sinPrefijo);
    const camino = traducible ? sinPrefijo : "/";

    return destino === "es" ? camino : `/en${camino === "/" ? "" : camino}`;
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {IDIOMAS.map((idioma, indice) => (
        <span key={idioma} className="flex items-center gap-1">
          {indice > 0 ? <span className="opacity-30">·</span> : null}
          {idioma === actual ? (
            <span aria-current="true" className="font-semibold">
              {NOMBRES[idioma]}
            </span>
          ) : (
            <Link
              href={equivalente(idioma)}
              hrefLang={idioma}
              className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
            >
              {NOMBRES[idioma]}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
