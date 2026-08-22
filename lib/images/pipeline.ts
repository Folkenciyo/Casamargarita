import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { MAX_DIMENSION, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "./limits";

/**
 * Duplicado a propósito de `urls.ts`: ese módulo lo importan componentes de
 * cliente y este otro arrastra sharp y fs. Sin la dependencia entre ambos, los
 * scripts de node pueden usar el pipeline sin bundler. Un test comprueba que
 * las dos listas no se separen.
 */
export const PIPELINE_WIDTHS = [400, 800, 1600, 3200] as const;
const IMAGE_WIDTHS = PIPELINE_WIDTHS;

export {
  MAX_DIMENSION,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
} from "./limits";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
]);

export type StoredImage = {
  basePath: string;
  width: number;
  height: number;
  widths: number[];
  blurDataUrl: string;
};

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? "/app/uploads";
}

/**
 * Une el directorio de subidas con una ruta relativa rechazando cualquier
 * intento de salir de él. Toda lectura de ficheros servidos pasa por aquí.
 */
export function resolveUploadPath(baseDir: string, relative: string): string {
  const base = resolve(baseDir);
  const target = resolve(base, relative);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error("Ruta fuera del directorio de subidas");
  }
  return target;
}

/** Borra todas las variantes de una imagen (o de una obra entera). */
export async function deleteUploads(
  baseDir: string,
  relativePath: string,
): Promise<void> {
  const target = resolveUploadPath(baseDir, relativePath);
  await rm(target, { recursive: true, force: true });
}

/**
 * Núcleo del pipeline: valida, normaliza y escribe todas las variantes de una
 * imagen en `basePath`. El nombre original del fichero se descarta siempre;
 * la ruta la componen ids nuestros, nunca el nombre que suba el navegador.
 *
 * Comparten esto tanto las fotos de obra (`storePaintingImage`) como el
 * retrato de la artista (`storeArtistPortrait`): mismos formatos, mismos
 * anchos, mismo placeholder borroso.
 */
async function storeImage({
  buffer,
  basePath,
  uploadsDir: dir,
}: {
  buffer: Buffer;
  basePath: string;
  uploadsDir: string;
}): Promise<StoredImage> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new RangeError(`Fichero demasiado grande (máximo ${MAX_UPLOAD_MB} MB)`);
  }

  // Magic bytes, no la extensión ni el Content-Type que envíe el navegador.
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new TypeError("El fichero no es una imagen admitida");
  }

  // rotate() sin argumentos aplica la orientación EXIF y la elimina.
  const source = sharp(buffer, { limitInputPixels: MAX_DIMENSION ** 2 }).rotate();
  const metadata = await source.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new TypeError("No se han podido leer las dimensiones de la imagen");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new RangeError(`Imagen demasiado grande (máximo ${MAX_DIMENSION} px)`);
  }

  const targetDir = resolveUploadPath(dir, basePath);
  await mkdir(targetDir, { recursive: true });

  // Original normalizado como copia maestra: no se sirve nunca.
  await writeFile(
    join(targetDir, "orig.jpg"),
    await source.clone().jpeg({ quality: 95 }).toBuffer(),
  );

  // Nunca se amplía. Si la imagen es más pequeña que 400 px se guarda igualmente
  // en el ancho mínimo para que el srcset no quede vacío.
  const widths = IMAGE_WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(IMAGE_WIDTHS[0]);

  for (const w of widths) {
    const resized = source.clone().resize({ width: w, withoutEnlargement: true });
    await writeFile(
      join(targetDir, `${w}.avif`),
      await resized.clone().avif({ quality: 55 }).toBuffer(),
    );
    await writeFile(
      join(targetDir, `${w}.webp`),
      await resized.clone().webp({ quality: 78 }).toBuffer(),
    );
  }

  const blur = await source
    .clone()
    .resize({ width: 8 })
    .webp({ quality: 30 })
    .toBuffer();

  return {
    basePath,
    width,
    height,
    widths: [...widths],
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/**
 * La copia maestra de una imagen ya guardada, para volver a trabajar sobre
 * ella. Es la que se normalizó al subir —orientación aplicada, EXIF fuera— y
 * la de más resolución que hay: las variantes servidas están reducidas.
 */
export async function readOriginal(
  baseDir: string,
  basePath: string,
): Promise<Buffer> {
  return readFile(join(resolveUploadPath(baseDir, basePath), "orig.jpg"));
}

/** Recorta una región y la devuelve como JPEG, lista para el pipeline. */
export async function cropRegion(
  buffer: Buffer,
  region: { left: number; top: number; width: number; height: number },
): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: MAX_DIMENSION ** 2 })
    .extract(region)
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** Las medidas de una imagen en memoria, sin escribir nada. */
export async function measure(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  return { width, height };
}

export async function storePaintingImage({
  buffer,
  paintingId,
  imageId,
  uploadsDir: dir,
}: {
  buffer: Buffer;
  paintingId: string;
  imageId: string;
  uploadsDir: string;
}): Promise<StoredImage> {
  return storeImage({
    buffer,
    basePath: join("paintings", paintingId, imageId),
    uploadsDir: dir,
  });
}

export async function storeJournalImage({
  buffer,
  entryId,
  imageId,
  uploadsDir: dir,
}: {
  buffer: Buffer;
  entryId: string;
  imageId: string;
  uploadsDir: string;
}): Promise<StoredImage> {
  return storeImage({
    buffer,
    basePath: join("journal", entryId, imageId),
    uploadsDir: dir,
  });
}

/**
 * El id va en la ruta igual que en las fotos de obra, aunque el artista solo
 * tenga un retrato a la vez: así cada subida obtiene una URL nueva y no
 * choca con la caché "immutable" del retrato anterior servido antes.
 */
export async function storeArtistPortrait({
  buffer,
  portraitId,
  uploadsDir: dir,
}: {
  buffer: Buffer;
  portraitId: string;
  uploadsDir: string;
}): Promise<StoredImage> {
  return storeImage({
    buffer,
    basePath: join("artist", portraitId),
    uploadsDir: dir,
  });
}
