/**
 * Estado mínimo de la capa de óleo, compartido entre el proveedor de
 * transiciones (React) y el bucle de render (Three). Un store propio de 40
 * líneas evita meter una dependencia de estado global para esto.
 */
export type StagePhase =
  | "idle" // nada que pintar, el canvas no renderiza
  | "intro" // apertura: el óleo se retira y descubre la web
  | "cover" // brochazo que tapa antes de cambiar de ruta
  | "held" // pantalla cubierta, esperando a que la ruta nueva monte
  | "reveal"; // el brochazo se retira en la ruta nueva

export type StageState = {
  phase: StagePhase;
  /** Ángulo del barrido en radianes; varía por transición. */
  angle: number;
};

let state: StageState = { phase: "idle", angle: 0 };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): StageState {
  return state;
}

export function setPhase(phase: StagePhase, angle = state.angle): void {
  if (state.phase === phase && state.angle === angle) return;
  state = { phase, angle };
  emit();
}

/** Cada transición barre en una dirección distinta: no parece una plantilla. */
export function randomAngle(): number {
  return (Math.random() - 0.5) * 0.9;
}

export const INTRO_SEEN_KEY = "casamargarita:intro-seen";

/**
 * Los tiempos del gesto. Son largos a propósito: a 420 ms el barrido se leía
 * como un parpadeo de color y no como una mano pintando. Lo que cuesta no es
 * tiempo perdido —la vista nueva se está cargando debajo mientras tanto—, así
 * que el gasto real es la diferencia entre esto y lo que tarde el servidor.
 */
export const COVER_MS = 780;
export const REVEAL_MS = 820;
export const INTRO_MS = 2100;

/**
 * Cuánto se queda la pantalla manchada como mínimo, aunque la vista nueva ya
 * esté lista. Sin esta pausa, una navegación instantánea encadena el cubrir y
 * el descubrir sin respirar y no se llega a ver la pantalla pintada.
 */
export const HOLD_MIN_MS = 220;

/**
 * A partir de qué punto del brochazo se pide la ruta nueva.
 *
 * No se espera al final: para entonces la pantalla ya está tapada y se habrían
 * regalado 780 ms de carga. Tampoco al principio, porque el cambio de vista
 * asomaría por debajo de la pintura. A esta altura del trazo la mancha cubre
 * ya casi todo y el relevo no se ve.
 */
export const NAVIGATE_AT = 0.62;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
