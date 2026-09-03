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

/**
 * JPEG de varios megas, del tamaño que sale de una cámara o de un móvil.
 *
 * Es de ruido y no de color plano a propósito: un JPEG de un solo color, por
 * grandes que sean sus lados, se comprime a unos pocos kilobytes. Con esas
 * imágenes de juguete la suite pasaba mientras el panel real rechazaba
 * cualquier foto de verdad, que es justo lo que este fichero tiene que impedir
 * que vuelva a ocurrir.
 *
 * El ruido es determinista: un fallo se reproduce igual la próxima vez.
 */
export function heavyPaintingJpeg(width = 2400, height = 1800): Promise<Buffer> {
  const pixels = Buffer.allocUnsafe(width * height * 3);

  let seed = 0x2545f491;
  for (let i = 0; i < pixels.length; i += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    pixels[i] = seed & 0xff;
  }

  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer();
}
