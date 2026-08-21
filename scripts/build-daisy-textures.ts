/**
 * Prepara las margaritas del fondo para usarlas como textura WebGL.
 *
 * Los originales son PNG de hasta 1,8 MB: bien para mirarlos, imposible para
 * algo que carga en todas las páginas públicas. Aquí salen en webp por debajo
 * de los 60 kB.
 *
 * El lienzo de destino es 512×1024 —potencia de dos— y la flor va centrada
 * dentro con transparencia alrededor. No es capricho: WebGL 1 solo genera
 * mipmaps de texturas con lados potencia de dos, y sin mipmaps una flor lejana
 * reducida a un tercio de su tamaño hierve de aliasing. El hueco transparente
 * no engorda el archivo, lo comprime el webp a nada.
 *
 * Se ejecuta a mano cuando cambien los originales:
 *   docker compose exec web pnpm build:daisies
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = path.join(process.cwd(), "public", "Margaritas");
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 1024;

async function main(): Promise<void> {
  const files = (await readdir(SOURCE_DIR))
    .filter((file) => file.toLowerCase().endsWith(".png"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No hay ningún PNG en ${SOURCE_DIR}`);
  }

  for (const file of files) {
    const source = path.join(SOURCE_DIR, file);
    const target = source.replace(/\.png$/i, ".webp");

    // trim() recorta el marco transparente que traen los originales: sin esto
    // la flor queda pequeña y descentrada dentro del lienzo, y cada archivo la
    // deja a una altura distinta.
    const flower = await sharp(source)
      .trim({ threshold: 1 })
      .resize({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer();

    const written = await sharp({
      create: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: flower, gravity: "center" }])
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toFile(target);

    console.log(
      `${file} → ${path.basename(target)} (${Math.round(written.size / 1024)} kB)`,
    );
  }
}

main().catch((error: unknown) => {
  console.error("No se pudieron preparar las texturas:", error);
  process.exit(1);
});
