export const MILESTONE_KINDS = [
  "EXHIBITION",
  "AWARD",
  "COLLECTION",
  "PRESS",
] as const;

export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  EXHIBITION: "Exposiciones",
  AWARD: "Premios",
  COLLECTION: "En colecciones",
  PRESS: "Prensa",
};

/** Singular, para el formulario del panel. */
export const MILESTONE_SINGULAR: Record<MilestoneKind, string> = {
  EXHIBITION: "Exposición",
  AWARD: "Premio",
  COLLECTION: "Colección",
  PRESS: "Mención en prensa",
};

/**
 * Orden en que se leen los bloques en la ficha: primero lo que más pesa en
 * una trayectoria y se comprueba antes.
 */
export const MILESTONE_ORDER: readonly MilestoneKind[] = [
  "EXHIBITION",
  "AWARD",
  "COLLECTION",
  "PRESS",
];

export function esMilestoneKind(valor: unknown): valor is MilestoneKind {
  return MILESTONE_KINDS.some((tipo) => tipo === valor);
}

/**
 * Agrupa por tipo respetando el orden de lectura y descartando los bloques
 * vacíos, para que la ficha no muestre un epígrafe sin nada debajo.
 */
export function agruparPorTipo<T extends { kind: MilestoneKind }>(
  hitos: readonly T[],
): { kind: MilestoneKind; etiqueta: string; hitos: T[] }[] {
  return MILESTONE_ORDER.map((kind) => ({
    kind,
    etiqueta: MILESTONE_LABELS[kind],
    hitos: hitos.filter((hito) => hito.kind === kind),
  })).filter((grupo) => grupo.hitos.length > 0);
}
