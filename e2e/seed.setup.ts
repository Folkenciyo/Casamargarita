import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { test as setup } from "@playwright/test";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { storePaintingImage } from "../lib/images/pipeline";
import { samplePaintingJpeg } from "./fixtures/images";
import {
  E2E_UPLOADS_DIR,
  SEEDED_ARTIST,
  SEEDED_PAINTINGS,
} from "./fixtures/test-data";

/**
 * Estado de partida de toda la suite. Se ejecuta como proyecto propio del que
 * dependen los demás, así que corre con el servidor ya en pie y antes que
 * cualquier test.
 *
 * Las fotos pasan por `storePaintingImage`, el mismo pipeline que usa el panel:
 * los tests públicos comprueban variantes reales escritas en disco, no fixtures
 * inventadas.
 */

const COLORS = [
  { r: 176, g: 122, b: 74 },
  { r: 74, g: 92, b: 110 },
];

setup("siembra la base de datos y las fotos de referencia", async () => {
  setup.setTimeout(120_000);

  const prisma = new PrismaClient();

  try {
    // Orden inverso a las dependencias: Inquiry e Image apuntan a Painting.
    await prisma.inquiry.deleteMany();
    await prisma.image.deleteMany();
    await prisma.painting.deleteMany();
    await prisma.artist.deleteMany();

    await rm(join(E2E_UPLOADS_DIR, "paintings"), {
      recursive: true,
      force: true,
    });
    await mkdir(E2E_UPLOADS_DIR, { recursive: true });

    await prisma.artist.create({
      data: { id: "singleton", ...SEEDED_ARTIST },
    });

    let colorIndex = 0;

    for (const item of SEEDED_PAINTINGS) {
      const { withImage, ...data } = item;
      const painting = await prisma.painting.create({ data });

      if (!withImage) continue;

      const imageId = randomUUID();
      const stored = await storePaintingImage({
        buffer: await samplePaintingJpeg(
          COLORS[colorIndex % COLORS.length] ?? COLORS[0]!,
        ),
        paintingId: painting.id,
        imageId,
        uploadsDir: E2E_UPLOADS_DIR,
      });
      colorIndex += 1;

      await prisma.image.create({
        data: {
          id: imageId,
          paintingId: painting.id,
          basePath: stored.basePath,
          width: stored.width,
          height: stored.height,
          widths: stored.widths,
          blurDataUrl: stored.blurDataUrl,
          alt: `${painting.title}, óleo sobre lienzo`,
          isPrimary: true,
          position: 0,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});
