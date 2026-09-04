/**
 * Combina el color y la opacidad de las hojas de césped (ambientCG,
 * Foliage006) en un único webp con canal alfa — igual que
 * build-flower-decal.ts, para el decal de hojas sueltas del suelo en vez de
 * las margaritas.
 *
 * El original es una rejilla irregular de ocho hojas — el recorte por hoja
 * lo hace la UV de cada instancia en build-room.ts, no este script.
 *
 * Se ejecuta a mano cuando cambien los originales:
 *   docker compose exec web pnpm build:foliage-decal
 */
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "Sala", "hojas");

async function main(): Promise<void> {
  const target = path.join(DIR, "decal.webp");
  const written = await sharp(path.join(DIR, "color.jpg"))
    .joinChannel(path.join(DIR, "opacity.jpg"))
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(target);

  console.log(`color.jpg + opacity.jpg → decal.webp (${Math.round(written.size / 1024)} kB)`);
}

main().catch((error: unknown) => {
  console.error("No se pudo preparar el decal de hojas:", error);
  process.exit(1);
});
