import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { storePaintingImage, uploadsDir } from "@/lib/images/pipeline";

export type ResultadoSubida =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * El núcleo de subir una foto de obra, sin autenticación ni transporte: lo
 * usan tanto la Server Action `uploadPaintingImage` (subida sin JS) como la
 * ruta `app/api/admin/obras/[id]/imagenes` (subida con barra de progreso por
 * XHR). Ninguna de las dos duplica la lógica de guardar el fichero y crear la
 * fila `Image`.
 */
export async function guardarFotoObra({
  paintingId,
  file,
  alt,
}: {
  paintingId: string;
  file: File;
  alt: string;
}): Promise<ResultadoSubida> {
  const painting = await prisma.painting.findUnique({
    where: { id: paintingId },
    select: { slug: true, _count: { select: { images: true } } },
  });
  if (!painting) return { ok: false, error: "La obra ya no existe" };

  const imageId = randomUUID();
  let stored;
  try {
    stored = await storePaintingImage({
      buffer: Buffer.from(await file.arrayBuffer()),
      paintingId,
      imageId,
      uploadsDir: uploadsDir(),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo procesar",
    };
  }

  await prisma.image.create({
    data: {
      id: imageId,
      paintingId,
      basePath: stored.basePath,
      width: stored.width,
      height: stored.height,
      widths: stored.widths,
      blurDataUrl: stored.blurDataUrl,
      alt: alt || null,
      isPrimary: painting._count.images === 0,
      position: painting._count.images,
    },
  });

  return { ok: true, slug: painting.slug };
}
