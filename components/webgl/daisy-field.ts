/**
 * El campo de margaritas del fondo, sin una sola llamada a WebGL.
 *
 * Todo lo que decide qué flor se ve, dónde y cuánto se inclina es función pura
 * del tiempo: mismo segundo, mismo campo. Además de dejarlo probable, evita el
 * problema clásico de `Math.random()` en un bucle de render —cada fotograma
 * saldría un valor distinto y la escena temblaría.
 */

/** Segundos que dura una flor de brotar a desvanecerse del todo. */
export const LIFE_S = 26;

/** Cuánto tarda en aparecer y en irse. Largo: nadie debe verla «encenderse». */
export const FADE_S = 5;

/** Texturas disponibles; el índice lo resuelve quien dibuja. */
export const TEXTURES = [
  "/Margaritas/margarita1.webp",
  "/Margaritas/margarita2.webp",
  "/Margaritas/margarita3.webp",
] as const;

/**
 * Un carril por flor simultánea: dónde brota, a qué profundidad y con cuánto
 * detalle. Cinco: los tres de los márgenes, que enmarcan sin estorbar, y dos
 * hacia el centro, que son los que hacen que el campo no parezca a medio
 * plantar. Del centro se ocupan los enfocados a propósito —son los que se
 * miran de frente, y ahí un borrón se lee como una mancha de suciedad—, pero
 * con la misma opacidad de marca de agua que los demás.
 *
 * `z` en metros hacia dentro de la pantalla: la cercana se mueve mucho con el
 * scroll y la lejana casi nada, y de ahí sale el parallax sin calcularlo
 * aparte.
 *
 * `height` en fracción de lo que se ve a esa profundidad, no en metros: así la
 * composición aguanta igual en un móvil que en un monitor ancho. En metros, la
 * flor lejana se encogería hasta ser un punto en cuanto la perspectiva hiciera
 * su trabajo.
 *
 * `side` fijo y no al azar: con el lado sorteado, tarde o temprano salían las
 * cinco apiladas en la misma esquina.
 */
const LANES = [
  { z: -2.4, height: 0.52, side: -1, near: 0.45, far: 0.95, focus: 0 },
  { z: -6, height: 0.44, side: 1, near: 0.45, far: 0.95, focus: 0 },
  { z: -11, height: 0.36, side: -1, near: 0.45, far: 0.95, focus: 0 },
  { z: -4.2, height: 0.4, side: 1, near: 0.06, far: 0.4, focus: 0.7 },
  { z: -7.8, height: 0.34, side: -1, near: 0.06, far: 0.4, focus: 0.75 },
] as const;

/** Cuántas flores hay a la vez. Es un fondo, no un ramo. */
export const SLOTS = LANES.length;

export type Daisy = {
  /** Índice dentro de TEXTURES. */
  texture: number;
  /** Posición lateral en fracción del semiancho visible: -1 y 1 son los bordes. */
  x: number;
  /** Profundidad en metros, siempre negativa. */
  z: number;
  /** Alto en fracción del alto visible a su profundidad. */
  height: number;
  /** Sesgo de mip: 0 nítida, 2 y pico disuelta en el fondo. */
  blur: number;
  /** Giro sobre el eje vertical, radianes. Le quita la planitud de la estampa. */
  turn: number;
  /** 0 recién brotada o ya ida, 1 en plena vida. */
  opacity: number;
  /** Desfase propio del meneo: dos flores contiguas nunca van a compás. */
  phase: number;
};

/**
 * Hash entero → [0,1). Determinista y sin estado, que es justo lo que no da
 * `Math.random()`. La constante es la del generador de Wang.
 */
export function random01(seed: number): number {
  let n = Math.trunc(seed) | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

/**
 * Cuánto se inclina lo que haya en `x` en el instante `time`, en radianes.
 *
 * Tres senos de periodo dispar para que no se oiga el bucle, más una ráfaga
 * lenta que va y viene: un solo seno se lee enseguida como metrónomo. El
 * término en `x` hace que la ondulación viaje de un lado a otro en vez de
 * mecer el campo entero a la vez.
 */
export function windAt(time: number, x: number): number {
  const gust = 0.55 + 0.45 * Math.sin(time * 0.11);
  const base =
    Math.sin(time * 0.62 - x * 0.35) * 0.6 +
    Math.sin(time * 0.97 + x * 0.6) * 0.28 +
    Math.sin(time * 1.73 + x * 1.1) * 0.12;
  return base * gust * 0.14;
}

/** Opacidad del ciclo de vida: entra, se queda, se va. */
export function lifeOpacity(age: number): number {
  if (age <= 0 || age >= LIFE_S) return 0;
  if (age < FADE_S) return age / FADE_S;
  if (age > LIFE_S - FADE_S) return (LIFE_S - age) / FADE_S;
  return 1;
}

/**
 * El campo entero en el instante `time` (segundos).
 *
 * Cada hueco vive su propio ciclo desfasado, así que nunca coinciden dos
 * apariciones ni el fondo se queda vacío de golpe. La posición y la textura de
 * cada brote salen del número de ciclo: la flor que sale ahora no estaba donde
 * la anterior.
 */
export function fieldAt(time: number): Daisy[] {
  const field: Daisy[] = [];

  for (let slot = 0; slot < SLOTS; slot += 1) {
    const lane = LANES[slot]!;

    // Los ciclos se reparten la vuelta completa: con cinco huecos, cada uno
    // brota a un quinto de vida del anterior y nunca coinciden dos entradas.
    const local = time + (slot * LIFE_S) / SLOTS;
    const generation = Math.floor(local / LIFE_S);
    const age = local - generation * LIFE_S;

    const seed = generation * 977 + slot * 31;
    const spot = random01(seed);

    field.push({
      texture: Math.floor(random01(seed + 7) * TEXTURES.length) % TEXTURES.length,
      x: lane.side * (lane.near + spot * (lane.far - lane.near)),
      z: lane.z,
      height: lane.height * (0.85 + random01(seed + 13) * 0.3),
      // El desenfoque lo marca la profundidad, y el carril decide cuánto de esa
      // bruma se le perdona: las centrales se miran de frente y ahí un borrón
      // se lee como suciedad en la pantalla, no como lejanía.
      blur: Math.min(-lane.z / 6, 2.2) * (1 - lane.focus),
      // Media vuelta larga, nunca de perfil: de canto la estampa desaparece.
      turn: (random01(seed + 19) - 0.5) * 0.9,
      opacity: lifeOpacity(age),
      phase: random01(seed + 23) * Math.PI * 2,
    });
  }

  return field;
}
