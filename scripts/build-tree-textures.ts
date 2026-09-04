/**
 * Convierte a webp las texturas del árbol de la esquina exterior (tronco y
 * follaje). Los originales vienen del modelo comprado
 * (`tree 3d model free.zip`, ver TODO.md) con nombres largos de fábrica;
 * aquí se les da nombre corto y se recortan a un peso razonable.
 *
 * Se ejecuta a mano cuando cambien los originales:
 *   docker compose exec web pnpm build:tree-textures
 */
import path from "node:path";
import sharp from "sharp";

const TREE_DIR = path.join(process.cwd(), "public", "Sala", "arbol");

// El color del follaje trae canal alfa (recorta la silueta de la hoja): hay
// que conservarlo, así que su calidad es algo más alta que la del tronco.
const SOURCES: Array<{ name: string; quality: number }> = [
  { name: "trunk-color", quality: 82 },
  { name: "trunk-normal", quality: 90 },
  { name: "foliage-color", quality: 88 },
  { name: "foliage-normal", quality: 90 },
];

async function buildOne(name: string, quality: number): Promise<void> {
  const source = path.join(TREE_DIR, `${name}.png`);
  const target = path.join(TREE_DIR, `${name}.webp`);

  const written = await sharp(source).webp({ quality, effort: 6 }).toFile(target);

  console.log(`${name}.png → ${name}.webp (${Math.round(written.size / 1024)} kB)`);
}

async function main(): Promise<void> {
  for (const { name, quality } of SOURCES) await buildOne(name, quality);
}

main().catch((error: unknown) => {
  console.error("No se pudieron preparar las texturas del árbol:", error);
  process.exit(1);
});
