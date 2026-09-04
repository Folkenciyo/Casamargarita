/**
 * Llena la web de desarrollo con contenido de demostración: artista con
 * retrato y biografía, series, obra con fotos de detalle, diario de taller,
 * trayectoria, consultas y encargos.
 *
 *   docker compose exec web pnpm seed:demo            # añade a lo que haya
 *   docker compose exec web pnpm seed:demo --reset    # vacía y siembra de cero
 *
 * Las obras son de dominio público del Art Institute of Chicago y las fotos de
 * detalle son recortes ampliados de la propia imagen: sirven para ver el visor
 * de detalle con material realista sin inventarse un cuadro. Todo pasa por el
 * mismo pipeline de imágenes que usa el panel, dentro del contenedor.
 *
 * **Nunca contra producción.** Escribe directamente en Postgres saltándose el
 * panel, así que al terminar avisa al servidor para que vacíe su caché de
 * datos; sin eso las páginas públicas seguirían enseñando lo de antes.
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { toSlug } from "../lib/catalog.ts";
import {
  storeArtistPortrait,
  storeJournalImage,
  storePaintingImage,
} from "../lib/images/pipeline.ts";
import {
  ARTIST,
  COMMISSIONS,
  DETAIL_CAPTIONS,
  INQUIRIES,
  JOURNAL,
  MILESTONES,
  SERIES,
} from "./demo-content.ts";

const prisma = new PrismaClient();
const SEARCH = "https://api.artic.edu/api/v1/artworks/search";
// El Art Institute pide identificarse; sin esta cabecera el IIIF devuelve 403.
const HEADERS = {
  "AIC-User-Agent": "Galeria de oleos (demo local)",
  "User-Agent": "Galeria de oleos (demo local)",
};
const IIIF = "https://www.artic.edu/iiif/2";
const UPLOADS = process.env.UPLOADS_DIR ?? "/app/uploads";
const WANTED = 14;

type Artwork = {
  id: number;
  title: string;
  date_end: number | null;
  image_id: string | null;
  medium_display: string | null;
  artist_title: string | null;
};

async function search(query: string, limit: number): Promise<Artwork[]> {
  const url = new URL(SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "id,title,date_end,image_id,medium_display,artist_title",
  );
  url.searchParams.set("query[term][is_public_domain]", "true");

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`La API respondió ${response.status}`);
  const body = (await response.json()) as { data: Artwork[] };
  return body.data.filter((art) => art.image_id);
}

async function download(imageId: string, width = 1686): Promise<Buffer | null> {
  const response = await fetch(`${IIIF}/${imageId}/full/${width},/0/default.jpg`, {
    headers: HEADERS,
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Recorta un trozo de la obra y lo amplía: es lo que haría la artista al
 * fotografiar el empaste de cerca. Tres zonas distintas para que las fotos de
 * detalle de una misma obra no se parezcan entre sí.
 */
async function cropDetail(buffer: Buffer, index: number): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  const side = Math.round(Math.min(width, height) * 0.34);
  const spots = [
    { x: 0.08, y: 0.12 },
    { x: 0.56, y: 0.46 },
    { x: 0.30, y: 0.62 },
  ];
  const spot = spots[index % spots.length]!;

  return sharp(buffer)
    .extract({
      left: Math.min(Math.round(width * spot.x), Math.max(0, width - side)),
      top: Math.min(Math.round(height * spot.y), Math.max(0, height - side)),
      width: side,
      height: side,
    })
    .resize(1400)
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Precio de mentira pero verosímil, estable para la misma obra. */
function demoPrice(id: number): number | null {
  if (id % 7 === 0) return null; // alguna "a consultar"
  return (60 + ((id * 37) % 240)) * 5000;
}

const STATUSES = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "RESERVED", "SOLD", "NOT_FOR_SALE"] as const;

async function reset() {
  // Orden inverso a las dependencias.
  await prisma.paintingView.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.journalImage.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.image.deleteMany();
  await prisma.painting.deleteMany();
  await prisma.series.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.commission.deleteMany();
  console.log("Base vaciada.");
}

async function seedArtist() {
  const portraits = await search("portrait of a woman painting", 12);
  const chosen = portraits[0];
  let portrait = {};

  if (chosen?.image_id) {
    const buffer = await download(chosen.image_id, 1200);
    if (buffer) {
      const portraitId = randomUUID();
      const stored = await storeArtistPortrait({
        buffer,
        portraitId,
        uploadsDir: UPLOADS,
      });
      portrait = {
        portraitPath: stored.basePath,
        portraitWidth: stored.width,
        portraitHeight: stored.height,
        portraitWidths: stored.widths,
        portraitBlurDataUrl: stored.blurDataUrl,
      };
    }
  }

  const data = { ...ARTIST, ...portrait, showSoldPaintings: true };
  await prisma.artist.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  console.log(`  ✓ artista: ${ARTIST.name}${"portraitPath" in portrait ? " (con retrato)" : " (sin retrato)"}`);
}

async function seedSeries(): Promise<string[]> {
  const ids: string[] = [];
  for (const [index, serie] of SERIES.entries()) {
    const created = await prisma.series.create({
      data: {
        slug: toSlug(serie.title),
        title: serie.title,
        description: serie.description,
        published: true,
        position: index,
      },
    });
    ids.push(created.id);
    console.log(`  ✓ serie: ${serie.title}`);
  }
  return ids;
}

async function uniqueSlugFor(title: string): Promise<string> {
  const base = toSlug(title).slice(0, 60);
  let slug = base;
  let n = 1;
  while (await prisma.painting.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function seedPaintings(seriesIds: string[]): Promise<string[]> {
  const artworks = (await search("oil on canvas landscape", 40))
    .filter((art) => /oil/i.test(art.medium_display ?? ""))
    .slice(0, WANTED);

  const last = await prisma.painting.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let position = (last?.position ?? -1) + 1;
  const created: string[] = [];

  for (const [index, art] of artworks.entries()) {
    const buffer = await download(art.image_id!);
    if (!buffer) {
      console.warn(`  ✗ saltada "${art.title}": no se pudo descargar`);
      continue;
    }

    const slug = await uniqueSlugFor(art.title);
    // Tamaños variados para que se vean los tres formatos de la galería.
    const anchos = [24, 40, 60, 100, 130];
    const widthCm = anchos[index % anchos.length]!;

    const painting = await prisma.painting.create({
      data: {
        slug,
        title: art.title,
        description: art.artist_title
          ? `Obra de dominio público de ${art.artist_title}. Contenido de demostración para ver la web con material real.`
          : "Contenido de demostración.",
        year: art.date_end,
        technique: art.medium_display ?? "Óleo sobre lienzo",
        widthCm,
        heightCm: widthCm,
        priceCents: demoPrice(art.id),
        status: STATUSES[index % STATUSES.length]!,
        featured: index < 5,
        published: true,
        seriesId: seriesIds[index % seriesIds.length] ?? null,
        position: position++,
      },
    });
    created.push(painting.id);

    // Foto principal, y de ella salen las de detalle.
    const mainId = randomUUID();
    const stored = await storePaintingImage({
      buffer,
      paintingId: painting.id,
      imageId: mainId,
      uploadsDir: UPLOADS,
    });

    await prisma.painting.update({
      where: { id: painting.id },
      data: { heightCm: Math.round((stored.height / stored.width) * widthCm) },
    });

    await prisma.image.create({
      data: {
        id: mainId,
        paintingId: painting.id,
        basePath: stored.basePath,
        width: stored.width,
        height: stored.height,
        widths: stored.widths,
        blurDataUrl: stored.blurDataUrl,
        alt: `${art.title}, óleo sobre lienzo`,
        isPrimary: true,
        position: 0,
      },
    });

    // Dos o tres detalles por obra: es lo que da sentido al visor de zoom.
    const cuantos = 2 + (index % 2);
    for (let d = 0; d < cuantos; d++) {
      const detailId = randomUUID();
      const detail = await storePaintingImage({
        buffer: await cropDetail(buffer, d),
        paintingId: painting.id,
        imageId: detailId,
        uploadsDir: UPLOADS,
      });
      await prisma.image.create({
        data: {
          id: detailId,
          paintingId: painting.id,
          basePath: detail.basePath,
          width: detail.width,
          height: detail.height,
          widths: detail.widths,
          blurDataUrl: detail.blurDataUrl,
          alt: DETAIL_CAPTIONS[d % DETAIL_CAPTIONS.length]!,
          isPrimary: false,
          position: d + 1,
        },
      });
    }

    console.log(`  ✓ ${art.title} — 1 foto + ${cuantos} detalles`);
  }

  return created;
}

async function seedJournal(paintingIds: string[]) {
  // Una sola búsqueda para todas las entradas: dentro del bucle serían cinco
  // llamadas idénticas a la API por nada.
  const fuentes = await search("oil painting detail brushwork", 20);

  for (const [index, entrada] of JOURNAL.entries()) {
    const created = await prisma.journalEntry.create({
      data: {
        slug: toSlug(entrada.title).slice(0, 60),
        title: entrada.title,
        summary: entrada.summary,
        body: entrada.body,
        published: true,
        // Una entrada cada dos semanas hacia atrás, para que el listado tenga
        // fechas creíbles en vez de todas la de hoy.
        publishedAt: new Date(Date.now() - index * 14 * 24 * 3600 * 1000),
        paintingId: paintingIds[index % Math.max(paintingIds.length, 1)] ?? null,
      },
    });

    // Las fotos del proceso son recortes ampliados, como las de detalle.
    const fuente = fuentes[index % Math.max(fuentes.length, 1)];
    const original = fuente?.image_id ? await download(fuente.image_id, 1200) : null;
    if (!original) {
      console.warn(`  ⚠ diario "${entrada.title}" sin fotos: no se pudo descargar`);
      continue;
    }

    for (let i = 0; i < 2; i++) {
      const imageId = randomUUID();
      const stored = await storeJournalImage({
        buffer: await cropDetail(original, i),
        entryId: created.id,
        imageId,
        uploadsDir: UPLOADS,
      });
      await prisma.journalImage.create({
        data: {
          id: imageId,
          entryId: created.id,
          basePath: stored.basePath,
          width: stored.width,
          height: stored.height,
          widths: stored.widths,
          blurDataUrl: stored.blurDataUrl,
          alt: entrada.title,
          caption: DETAIL_CAPTIONS[i % DETAIL_CAPTIONS.length]!,
          position: i,
        },
      });
    }

    console.log(`  ✓ diario: ${entrada.title}`);
  }
}

async function seedRest(paintingIds: string[]) {
  await prisma.milestone.createMany({
    data: MILESTONES.map((hito, index) => ({
      kind: hito.kind,
      title: hito.title,
      place: hito.place,
      year: hito.year,
      url: "url" in hito ? hito.url : "",
      published: true,
      position: index,
    })),
  });
  console.log(`  ✓ ${MILESTONES.length} hitos de trayectoria`);

  for (const [index, consulta] of INQUIRIES.entries()) {
    const hace = (index + 1) * 3 * 24 * 3600 * 1000;
    await prisma.inquiry.create({
      data: {
        paintingId: paintingIds[index % Math.max(paintingIds.length, 1)] ?? null,
        name: consulta.name,
        email: consulta.email,
        message: consulta.message,
        createdAt: new Date(Date.now() - hace),
        readAt: index < 4 ? new Date(Date.now() - hace + 3600 * 1000) : null,
        answeredAt: consulta.answered ? new Date(Date.now() - hace + 7200 * 1000) : null,
      },
    });
  }
  console.log(`  ✓ ${INQUIRIES.length} consultas`);

  for (const [index, encargo] of COMMISSIONS.entries()) {
    await prisma.commission.create({
      data: {
        name: encargo.name,
        email: encargo.email,
        brief: encargo.brief,
        widthCm: encargo.widthCm,
        heightCm: encargo.heightCm,
        deadline: encargo.deadline,
        createdAt: new Date(Date.now() - (index + 1) * 5 * 24 * 3600 * 1000),
        readAt: index < 2 ? new Date() : null,
      },
    });
  }
  console.log(`  ✓ ${COMMISSIONS.length} encargos`);

  // Visitas repartidas en el último mes, para que el panel tenga algo que
  // enseñar en "obra más mirada".
  const dia = 24 * 3600 * 1000;
  for (const [index, paintingId] of paintingIds.entries()) {
    for (let d = 0; d < 30; d += 1 + (index % 3)) {
      const fecha = new Date(Date.now() - d * dia);
      const day = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
      await prisma.paintingView.upsert({
        where: { paintingId_day: { paintingId, day } },
        create: { paintingId, day, count: 1 + ((index * 7 + d) % 19) },
        update: {},
      });
    }
  }
  console.log(`  ✓ visitas de los últimos 30 días`);
}

/**
 * Las páginas públicas leen de un caché con etiquetas que solo invalidan las
 * Server Actions del panel. Esto ha entrado por Prisma, así que hay que
 * pedirle al servidor que lo vacíe o no se vería nada nuevo.
 */
async function revalidate() {
  const secret = process.env.REVALIDATE_SECRET;
  const url = process.env.PUBLIC_URL ?? "http://localhost:3000";
  if (!secret) {
    console.warn(
      "\n⚠ Sin REVALIDATE_SECRET no se puede vaciar el caché: la web seguirá\n" +
        "  enseñando lo anterior hasta una hora. Añádelo al compose de desarrollo.",
    );
    return;
  }
  try {
    const response = await fetch(`${url}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    console.log(response.ok ? "\nCaché vaciado." : `\n⚠ El caché respondió ${response.status}`);
  } catch {
    console.warn("\n⚠ No se pudo avisar al servidor; reinícialo para ver los cambios.");
  }
}

async function main() {
  if (process.argv.includes("--reset")) await reset();

  console.log("Sembrando…");
  await seedArtist();
  const seriesIds = await seedSeries();
  const paintingIds = await seedPaintings(seriesIds);
  await seedJournal(paintingIds);
  await seedRest(paintingIds);
  await revalidate();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
