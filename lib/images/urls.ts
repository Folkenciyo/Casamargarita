// Solo construcción de URLs: sin sharp, sin fs. Este módulo lo importan
// también los componentes de cliente.
export const IMAGE_WIDTHS = [400, 800, 1600] as const;

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
