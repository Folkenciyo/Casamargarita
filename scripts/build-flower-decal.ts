/**
 * Combina el color y la opacidad del set de margaritas (ambientCG,
 * FlowerSet001) en un único webp con canal alfa: el decal de 3D pide una
 * sola textura, no dos, para recortar cada flor sobre el suelo.
 *
 * El original es una rejilla de 3×2 margaritas sueltas — el recorte por
 * flor lo hace la UV de cada instancia en build-room.ts, no este script.
 *
 * Se ejecuta a mano cuando cambien los originales:
 *   docker compose exec web pnpm build:flower-decal
 */
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "Sala", "margaritas");

async function main(): Promise<void> {
  const target = path.join(DIR, "decal.webp");
  const written = await sharp(path.join(DIR, "color.jpg"))
    .joinChannel(path.join(DIR, "opacity.jpg"))
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(target);

  console.log(`color.jpg + opacity.jpg → decal.webp (${Math.round(written.size / 1024)} kB)`);
}

main().catch((error: unknown) => {
  console.error("No se pudo preparar el decal de margaritas:", error);
  process.exit(1);
});
