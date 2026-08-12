/**
 * Rellena la galería con óleos de dominio público del Art Institute of Chicago
 * para poder ver la web con contenido real. Son obras de demostración: se
 * borran cuando entre la obra de la artista.
 *
 *   docker compose exec web pnpm seed:demo
 *
 * Descarga y procesa todo dentro del contenedor, con el mismo pipeline de
 * imágenes que usa el panel de administración.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { storePaintingImage } from "../lib/images/pipeline.ts";
import { toSlug } from "../lib/catalog.ts";

const prisma = new PrismaClient();
const API = "https://api.artic.edu/api/v1/artworks/search";
// El Art Institute pide identificarse; sin esta cabecera el IIIF devuelve 403.
const HEADERS = {
  "AIC-User-Agent": "Galeria de oleos (demo local)",
  "User-Agent": "Galeria de oleos (demo local)",
};
const IIIF = "https://www.artic.edu/iiif/2";
const WANTED = 9;

type Artwork = {
  id: number;
  title: string;
  date_end: number | null;
  image_id: string | null;
  medium_display: string | null;
  artist_title: string | null;
};

async function fetchArtworks(): Promise<Artwork[]> {
  const url = new URL(API);
  url.searchParams.set("q", "oil on canvas landscape");
  url.searchParams.set("limit", "40");
  url.searchParams.set(
    "fields",
    "id,title,date_end,image_id,medium_display,artist_title",
  );
  url.searchParams.set("query[term][is_public_domain]", "true");

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`API respondió ${response.status}`);
  const body = (await response.json()) as { data: Artwork[] };

  return body.data
    .filter((art) => art.image_id && /oil/i.test(art.medium_display ?? ""))
    .slice(0, WANTED);
}

/** Precio de mentira pero verosímil, estable para la misma obra. */
function demoPrice(id: number): number | null {
  if (id % 7 === 0) return null; // alguna "a consultar"
  return (60 + ((id * 37) % 240)) * 5000;
}

async function main() {
  const artworks = await fetchArtworks();
  console.log(`Encontradas ${artworks.length} obras de dominio público`);

  const last = await prisma.painting.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let position = (last?.position ?? -1) + 1;

  for (const art of artworks) {
    // Primero la imagen: si falla, no se crea la obra y no quedan filas
    // huérfanas sin foto.
    const response = await fetch(
      `${IIIF}/${art.image_id}/full/1686,/0/default.jpg`,
      { headers: HEADERS },
    );
    if (!response.ok) {
      console.warn(`  saltada "${art.title}": imagen ${response.status}`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const base = toSlug(art.title).slice(0, 60);
    let slug = base;
    let n = 1;
    while (await prisma.painting.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }

    // Medidas plausibles a partir de la proporción real de la imagen.
    const painting = await prisma.painting.create({
      data: {
        slug,
        title: art.title,
        description: art.artist_title
          ? `Obra de dominio público de ${art.artist_title}. Contenido de demostración.`
          : "Contenido de demostración.",
        year: art.date_end,
        technique: art.medium_display ?? "Óleo sobre lienzo",
        widthCm: 100,
        heightCm: 80,
        priceCents: demoPrice(art.id),
        featured: position < 4,
        position: position++,
      },
    });

    const imageId = randomUUID();
    const stored = await storePaintingImage({
      buffer,
      paintingId: painting.id,
      imageId,
      uploadsDir: process.env.UPLOADS_DIR ?? "/app/uploads",
    });

    // Las medidas del catálogo siguen la proporción de la foto.
    const heightCm = Math.round((stored.height / stored.width) * 100);
    await prisma.painting.update({
      where: { id: painting.id },
      data: { heightCm },
    });

    await prisma.image.create({
      data: {
        id: imageId,
        paintingId: painting.id,
        basePath: stored.basePath,
        width: stored.width,
        height: stored.height,
        widths: stored.widths,
        blurDataUrl: stored.blurDataUrl,
        alt: art.title,
        isPrimary: true,
        position: 0,
      },
    });

    console.log(`  ✓ ${art.title} (${stored.width}×${stored.height})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
