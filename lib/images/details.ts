/**
 * Dónde recortar las fotos de detalle de una obra.
 *
 * Sin sharp ni ficheros: solo aritmética sobre las medidas del original, para
 * poder probarlo y para que el panel pueda decidir si ofrece el botón sin
 * abrir la imagen.
 */

export type DetailCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Lado menor mínimo del original para que un recorte valga la pena.
 *
 * Por debajo de esto el detalle sale blando: ampliar píxeles no enseña
 * pincelada, y en una galería que vende materia pictórica eso se nota. El
 * número sale de la cuenta al revés: con un recorte del 40 %, 2000 px de lado
 * menor dan 800 px de detalle, que es la primera variante decente del
 * pipeline.
 */
export const DETAIL_MIN_SOURCE_PX = 2000;

/** Qué parte del lado menor abarca cada detalle. */
const DETAIL_FRACTION = 0.4;

/**
 * Tres zonas repartidas por el cuadro, en fracción del espacio libre.
 *
 * Ni el centro tres veces ni las cuatro esquinas: se busca que los detalles de
 * una misma obra no se parezcan entre sí, que es justo lo que le pasa a quien
 * recorta a ojo siempre por el mismo sitio.
 */
const SPOTS = [
  { x: 0.1, y: 0.15 },
  { x: 0.55, y: 0.45 },
  { x: 0.28, y: 0.78 },
] as const;

/** Cuántos detalles se generan de una foto. */
export const DETAIL_COUNT = SPOTS.length;

/** Si el original da para detalles de verdad. */
export function canGenerateDetails(width: number, height: number): boolean {
  return Math.min(width, height) >= DETAIL_MIN_SOURCE_PX;
}

/**
 * Los recortes, en píxeles y siempre dentro de la imagen. Cuadrados: el
 * detalle es una toma cercana, no un recorte de la composición, y un cuadrado
 * no arrastra la proporción del cuadro.
 */
export function detailCrops(width: number, height: number): DetailCrop[] {
  const side = Math.round(Math.min(width, height) * DETAIL_FRACTION);
  const maxLeft = Math.max(0, width - side);
  const maxTop = Math.max(0, height - side);

  return SPOTS.map((spot) => ({
    left: Math.min(Math.round(width * spot.x), maxLeft),
    top: Math.min(Math.round(height * spot.y), maxTop),
    width: Math.min(side, width),
    height: Math.min(side, height),
  }));
}

/** Pie de foto de cada detalle, en el orden en que se generan. */
export function detailCaption(index: number): string {
  const nombres = ["Detalle de la pincelada", "Detalle del empaste", "Detalle de la materia"];
  return nombres[index % nombres.length]!;
}
