/**
 * Prepara las texturas PBR de la sala 3D (pared, suelo, marco de los
 * cuadros) para servirlas por la web.
 *
 * Los originales de ambientCG pesan de sobra para eso: el normal map del
 * suelo solo son 2,9 MB en PNG. Aquí salen en webp, mucho más ligeros. La
 * calidad de `normal`/`roughness` es más alta que la de `color` a propósito:
 * son datos que alimentan la iluminación, no una foto — un artefacto de
 * compresión ahí se nota en cómo rebota la luz, no solo a simple vista.
 *
 * Se ejecuta a mano cuando cambien los originales:
 *   docker compose exec web pnpm build:room-textures
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOM_DIR = path.join(process.cwd(), "public", "Sala");

const QUALITY: Record<string, number> = {
  color: 82,
  roughness: 82,
  normal: 90,
};

async function buildOne(dir: string, file: string): Promise<void> {
  const nombre = path.parse(file).name; // "color" | "normal" | "roughness"
  const calidad = QUALITY[nombre];
  if (!calidad) return; // ficheros que no son un mapa (p.ej. ya un .webp)

  const source = path.join(dir, file);
  const target = path.join(dir, `${nombre}.webp`);

  const written = await sharp(source)
    .webp({ quality: calidad, effort: 6 })
    .toFile(target);

  console.log(
    `${path.relative(ROOM_DIR, source)} → ${path.relative(ROOM_DIR, target)} (${Math.round(written.size / 1024)} kB)`,
  );
}

async function main(): Promise<void> {
  const carpetas = (await readdir(ROOM_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (carpetas.length === 0) {
    throw new Error(`No hay ninguna carpeta de textura en ${ROOM_DIR}`);
  }

  for (const carpeta of carpetas) {
    const dir = path.join(ROOM_DIR, carpeta);
    const ficheros = (await readdir(dir)).filter(
      (file) => !file.toLowerCase().endsWith(".webp"),
    );
    for (const file of ficheros) await buildOne(dir, file);
  }
}

main().catch((error: unknown) => {
  console.error("No se pudieron preparar las texturas de la sala:", error);
  process.exit(1);
});
