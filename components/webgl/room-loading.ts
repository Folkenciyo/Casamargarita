/**
 * Las fases por las que pasa el montaje de la sala y cuánto ocupa cada una
 * de la barra de carga.
 *
 * El reparto no es decorativo: la barra tiene que avanzar a un ritmo
 * parecido al del trabajo real o se lee como falsa. Las cuatro primeras son
 * construcción en el hilo principal —rápidas, pero es justo lo que antes
 * congelaba la pestaña—; `descargas` es la espera de red, con diferencia la
 * más larga, y por eso se lleva la mitad; `acabado` es compilar los shaders
 * de todo lo montado, un tirón corto pero muy visible si cae fuera de la
 * pantalla de carga.
 */
export type RoomLoadPhaseId =
  | "edificio"
  | "cuadros"
  | "carteles"
  | "jardin"
  | "descargas"
  | "acabado";

export type RoomLoadPhase = {
  id: RoomLoadPhaseId;
  /** Lo que se lee bajo la brocha mientras dura la fase. */
  label: string;
  /** Fracción de la barra, de 0 a 1. Entre todas suman 1. */
  weight: number;
};

export const ROOM_LOAD_PHASES: readonly RoomLoadPhase[] = [
  { id: "edificio", label: "Levantando las paredes", weight: 0.1 },
  { id: "cuadros", label: "Colgando los cuadros", weight: 0.15 },
  { id: "carteles", label: "Rotulando las salas", weight: 0.05 },
  { id: "jardin", label: "Plantando el jardín", weight: 0.1 },
  { id: "descargas", label: "Extendiendo la pintura", weight: 0.5 },
  { id: "acabado", label: "Dando la última mano", weight: 0.1 },
];

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Dónde queda la barra estando `within` (0 a 1) dentro de la fase `id`: la
 * suma de lo que pesan las fases ya pasadas más la parte recorrida de esta.
 */
export function roomLoadProgress(id: RoomLoadPhaseId, within: number): number {
  let before = 0;
  for (const phase of ROOM_LOAD_PHASES) {
    if (phase.id === id) return clamp01(before + phase.weight * clamp01(within));
    before += phase.weight;
  }
  return clamp01(before);
}

export function roomLoadLabel(id: RoomLoadPhaseId): string {
  return ROOM_LOAD_PHASES.find((phase) => phase.id === id)?.label ?? "";
}
