// Solo construcción de URLs: sin sharp, sin fs. Este módulo lo importan
// también los componentes de cliente.
//
// 3200 es el ancho del zoom de detalle: no entra en ningún `srcset` porque
// nadie debe descargarlo por navegar, solo al pedir ver la pincelada de cerca.
export const IMAGE_WIDTHS = [400, 800, 1600, 3200] as const;

/** El ancho de 3200 solo se sirve bajo petición explícita del visor de zoom. */
export const ZOOM_WIDTH = 3200;

/** Los que sí se ofrecen al navegador para que elija según la pantalla. */
export function responsiveWidths(widths: number[]): number[] {
  return widths.filter((width) => width < ZOOM_WIDTH);
}

/**
 * El ancho más grande disponible de una imagen. Las subidas antes de que
 * existiera el ancho de zoom no tienen 3200, y entonces el visor amplía sobre
 * la de 1600: se ve menos detalle, pero funciona igual.
 */
export function largestWidth(widths: number[]): number {
  return widths.length > 0 ? Math.max(...widths) : IMAGE_WIDTHS[0];
}

export type ImageFormat = "avif" | "webp";

export function imageUrl(
  basePath: string,
  width: number,
  format: ImageFormat,
): string {
  return `/api/uploads/${basePath}/${width}.${format}`;
}

export function srcSet(
  basePath: string,
  widths: number[],
  format: ImageFormat,
): string {
  return widths
    .map((w) => `${imageUrl(basePath, w, format)} ${w}w`)
    .join(", ");
}

const SERVABLE = new RegExp(`^(${IMAGE_WIDTHS.join("|")})\\.(avif|webp)$`);

/**
 * Solo las variantes generadas son públicas. `orig.jpg` es la copia maestra
 * de la artista y no se sirve nunca.
 */
export function isServableVariant(fileName: string): boolean {
  return SERVABLE.test(fileName);
}
