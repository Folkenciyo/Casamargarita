import sharp from "sharp";

/**
 * Imágenes sintéticas para los tests: nada de binarios en el repositorio.
 * Se generan con sharp, que ya está en el proyecto para el pipeline de subida.
 */

type Rgb = { r: number; g: number; b: number };

/** JPEG plano de 1200×900: el pipeline generará las variantes 400 y 800. */
export function samplePaintingJpeg(background: Rgb): Promise<Buffer> {
  return sharp({
    create: { width: 1200, height: 900, channels: 3, background },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** PNG pequeño para el formulario de subida del panel. */
export function samplePaintingPng(background: Rgb): Promise<Buffer> {
  return sharp({
    create: { width: 900, height: 600, channels: 3, background },
  })
    .png()
    .toBuffer();
}
