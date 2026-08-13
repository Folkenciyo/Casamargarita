/**
 * Formato de una obra a partir de sus medidas.
 *
 * Se deriva y no se guarda a propósito: es información que ya está en el
 * ancho y el alto, y un campo aparte solo daría ocasión de que se
 * contradijeran. La artista no tiene que clasificar nada.
 */
export const FORMATOS = ["pequeno", "mediano", "grande"] as const;
export type Formato = (typeof FORMATOS)[number];

export const FORMATO_ETIQUETAS: Record<Formato, string> = {
  pequeno: "Pequeño formato",
  mediano: "Formato medio",
  grande: "Gran formato",
};

/** Los cortes son los del lado mayor, que es lo que decide dónde cabe. */
const CORTE_PEQUENO_CM = 50;
const CORTE_MEDIANO_CM = 100;

export function formatoDe(anchoCm: number, altoCm: number): Formato {
  const ladoMayor = Math.max(anchoCm, altoCm);
  if (ladoMayor <= CORTE_PEQUENO_CM) return "pequeno";
  if (ladoMayor <= CORTE_MEDIANO_CM) return "mediano";
  return "grande";
}

/**
 * El `where` de Prisma equivalente. Se filtra por los dos lados a la vez
 * porque el corte lo marca el mayor de ellos: una obra de 30×120 es gran
 * formato aunque sea estrecha.
 */
export function formatoWhere(formato: Formato) {
  if (formato === "pequeno") {
    return { widthCm: { lte: CORTE_PEQUENO_CM }, heightCm: { lte: CORTE_PEQUENO_CM } };
  }

  if (formato === "grande") {
    return {
      OR: [
        { widthCm: { gt: CORTE_MEDIANO_CM } },
        { heightCm: { gt: CORTE_MEDIANO_CM } },
      ],
    };
  }

  // Mediano: ninguno de los dos lados pasa del corte alto, y al menos uno
  // supera el bajo.
  return {
    widthCm: { lte: CORTE_MEDIANO_CM },
    heightCm: { lte: CORTE_MEDIANO_CM },
    OR: [
      { widthCm: { gt: CORTE_PEQUENO_CM } },
      { heightCm: { gt: CORTE_PEQUENO_CM } },
    ],
  };
}

export function esFormato(valor: string | undefined): valor is Formato {
  return FORMATOS.some((formato) => formato === valor);
}
