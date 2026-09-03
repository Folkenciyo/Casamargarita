"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshArtist, refreshPublicViews } from "@/lib/admin/cache-refresh";
import { guardarFotoObra } from "@/lib/admin/painting-image-upload";
import { requireAdmin } from "@/lib/auth/guard";
import { uniqueSlug } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  canGenerateDetails,
  detailCaption,
  detailCrops,
  randomDetailCrop,
} from "@/lib/images/details";
import {
  cropRegion,
  deleteUploads,
  measure,
  readOriginal,
  storeArtistPortrait,
  storePaintingImage,
  uploadsDir,
} from "@/lib/images/pipeline";
import { artistSchema, paintingSchema } from "@/lib/validation/painting";

export type ActionState = { error?: string; ok?: boolean };

function fieldsFrom(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    technique: formData.get("technique") || undefined,
    year: formData.get("year") ?? "",
    widthCm: formData.get("widthCm"),
    heightCm: formData.get("heightCm"),
    priceCents: formData.get("priceCents") ?? "",
    status: formData.get("status") || undefined,
    published: formData.get("published") === "on",
    featured: formData.get("featured") === "on",
    // Cadena vacía = "sin serie"; el esquema la convierte en null.
    seriesId: formData.get("seriesId") ?? "",
  };
}

/**
 * Con dos pestañas abiertas se puede borrar una serie en una mientras se
 * edita una obra en la otra. Sin esto, guardar reventaría con un error de
 * clave foránea en crudo.
 */
async function serieInexistente(seriesId: string | null): Promise<boolean> {
  if (!seriesId) return false;
  return !(await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true },
  }));
}

const SERIE_PERDIDA = "Esa serie ya no existe. Vuelve a elegir una.";

export async function createPainting(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = paintingSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  if (await serieInexistente(parsed.data.seriesId)) {
    return { error: SERIE_PERDIDA };
  }

  const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
    Boolean(await prisma.painting.findUnique({ where: { slug: candidate } })),
  );
  const last = await prisma.painting.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const painting = await prisma.painting.create({
    data: { ...parsed.data, slug, position: (last?.position ?? -1) + 1 },
  });

  refreshPublicViews(slug);
  redirect(`/admin/obras/${painting.id}`);
}

export async function updatePainting(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = paintingSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  if (await serieInexistente(parsed.data.seriesId)) {
    return { error: SERIE_PERDIDA };
  }

  const painting = await prisma.painting.update({
    where: { id },
    data: parsed.data,
  });

  refreshPublicViews(painting.slug);
  return { ok: true };
}

/**
 * Publicar u ocultar desde la lista, sin entrar en la ficha. Lee el valor
 * actual en vez de recibirlo del formulario: así dos pestañas abiertas no
 * pueden dejar la obra en un estado que ninguna de las dos quería.
 */
export async function togglePaintingPublished(id: string): Promise<void> {
  await requireAdmin();

  const current = await prisma.painting.findUniqueOrThrow({
    where: { id },
    select: { published: true },
  });
  const painting = await prisma.painting.update({
    where: { id },
    data: { published: !current.published },
  });

  revalidatePath("/admin/obras");
  refreshPublicViews(painting.slug);
}

/**
 * Mandar a la papelera. No borra nada: marca la fecha y la obra desaparece de
 * la web y de la lista, pero sus fotos siguen en disco y se puede deshacer.
 *
 * El borrado de verdad lo hace `scripts/purge-trash.ts` pasados los días.
 */
export async function deletePainting(id: string): Promise<void> {
  await requireAdmin();

  const painting = await prisma.painting.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  refreshPublicViews(painting.slug);
  redirect("/admin/obras?papelera=si");
}

export async function restorePainting(id: string): Promise<void> {
  await requireAdmin();

  const painting = await prisma.painting.update({
    where: { id },
    data: { deletedAt: null },
  });

  refreshPublicViews(painting.slug);
  redirect(`/admin/obras/${painting.id}`);
}

/**
 * Borrado definitivo desde la papelera, sin esperar a que caduque. Aquí sí
 * desaparecen las fotos del disco y no hay vuelta atrás.
 */
export async function purgePainting(id: string): Promise<void> {
  await requireAdmin();

  const painting = await prisma.painting.delete({ where: { id } });
  // Las filas de Image caen por onDelete: Cascade; los ficheros hay que
  // borrarlos a mano.
  await deleteUploads(uploadsDir(), `paintings/${id}`);

  refreshPublicViews(painting.slug);
  redirect("/admin/obras?papelera=si");
}

/**
 * Subida sin JavaScript. La que usa progreso real de verdad pasa por
 * `app/api/admin/obras/[id]/imagenes` (ver `MultiUpload.tsx`); esta se queda
 * como camino de reserva y comparte el mismo núcleo (`guardarFotoObra`).
 */
export async function uploadPaintingImage(
  paintingId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen" };
  }

  const resultado = await guardarFotoObra({
    paintingId,
    file,
    alt: String(formData.get("alt") ?? ""),
  });
  if (!resultado.ok) return { error: resultado.error };

  refreshPublicViews(resultado.slug);
  return { ok: true };
}

/**
 * Fotos de detalle a partir de la principal: tres recortes ampliados de zonas
 * distintas del cuadro.
 *
 * No se dispara al subir, sino a petición. Un recorte enseña los píxeles que
 * ya había en la foto general, no la pincelada de cerca; con una toma de museo
 * el resultado convence y con una foto de móvil se nota. Quien mira el cuadro
 * decide, y por eso son fotos normales: se borran o se reordenan como las
 * demás.
 */
export async function generatePaintingDetails(
  paintingId: string,
  _state: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const painting = await prisma.painting.findUnique({
    where: { id: paintingId },
    select: {
      slug: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: { basePath: true },
      },
    },
  });
  if (!painting) return { error: "La obra ya no existe" };

  const principal = painting.images[0];
  if (!principal) return { error: "Sube antes una foto de la obra" };

  try {
    const original = await readOriginal(uploadsDir(), principal.basePath);
    const { width, height } = await measure(original);

    if (!canGenerateDetails(width, height)) {
      return {
        error:
          "La foto no tiene resolución suficiente para sacar detalles nítidos. Haz las tomas de cerca con la cámara.",
      };
    }

    // En serie y no en paralelo, igual que la subida de varias fotos: cada
    // recorte genera seis variantes con sharp y tres a la vez se comen la
    // memoria del contenedor.
    const position = painting.images.length;
    for (const [index, crop] of detailCrops(width, height).entries()) {
      const imageId = randomUUID();
      const stored = await storePaintingImage({
        buffer: await cropRegion(original, crop),
        paintingId,
        imageId,
        uploadsDir: uploadsDir(),
      });

      await prisma.image.create({
        data: {
          id: imageId,
          paintingId,
          basePath: stored.basePath,
          width: stored.width,
          height: stored.height,
          widths: stored.widths,
          blurDataUrl: stored.blurDataUrl,
          alt: detailCaption(index),
          isPrimary: false,
          isDetail: true,
          position: position + index,
        },
      });
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo procesar",
    };
  }

  revalidatePath(`/admin/obras/${paintingId}`);
  refreshPublicViews(painting.slug);
  return { ok: true };
}

/**
 * Repite un detalle ya generado, en otra zona al azar de la principal. Solo
 * para imágenes `isDetail`: una foto subida a mano no tiene de dónde
 * recortarse de nuevo.
 */
export async function regenerateDetailImage(imageId: string): Promise<void> {
  await requireAdmin();

  const detalle = await prisma.image.findUnique({
    where: { id: imageId },
    select: { id: true, isDetail: true, paintingId: true, basePath: true },
  });
  if (!detalle || !detalle.isDetail) return;

  const painting = await prisma.painting.findUnique({
    where: { id: detalle.paintingId },
    select: {
      slug: true,
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { basePath: true },
      },
    },
  });
  const principal = painting?.images[0];
  if (!painting || !principal) return;

  const original = await readOriginal(uploadsDir(), principal.basePath);
  const { width, height } = await measure(original);
  if (!canGenerateDetails(width, height)) return;

  const nuevoId = randomUUID();
  const stored = await storePaintingImage({
    buffer: await cropRegion(original, randomDetailCrop(width, height)),
    paintingId: detalle.paintingId,
    imageId: nuevoId,
    uploadsDir: uploadsDir(),
  });

  await prisma.image.update({
    where: { id: imageId },
    data: {
      basePath: stored.basePath,
      width: stored.width,
      height: stored.height,
      widths: stored.widths,
      blurDataUrl: stored.blurDataUrl,
    },
  });
  // Se borra después de guardar el nuevo: si algo fallara antes, la foto no
  // se queda sin recorte por el camino.
  await deleteUploads(uploadsDir(), detalle.basePath);

  revalidatePath(`/admin/obras/${detalle.paintingId}`);
  refreshPublicViews(painting.slug);
}

export async function deleteImage(imageId: string): Promise<void> {
  await requireAdmin();

  const image = await prisma.image.delete({ where: { id: imageId } });
  await deleteUploads(uploadsDir(), image.basePath);

  // Si se borró la principal, asciende la siguiente.
  const remaining = await prisma.image.findFirst({
    where: { paintingId: image.paintingId },
    orderBy: { position: "asc" },
  });
  if (remaining && image.isPrimary) {
    await prisma.image.update({
      where: { id: remaining.id },
      data: { isPrimary: true },
    });
  }

  revalidatePath(`/admin/obras/${image.paintingId}`);
  refreshPublicViews();
}

export async function setPrimaryImage(imageId: string): Promise<void> {
  await requireAdmin();

  const image = await prisma.image.findUniqueOrThrow({ where: { id: imageId } });
  await prisma.$transaction([
    prisma.image.updateMany({
      where: { paintingId: image.paintingId },
      data: { isPrimary: false },
    }),
    prisma.image.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);

  revalidatePath(`/admin/obras/${image.paintingId}`);
  refreshPublicViews();
}

export async function moveImage(
  imageId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireAdmin();

  const current = await prisma.image.findUniqueOrThrow({ where: { id: imageId } });
  const neighbour = await prisma.image.findFirst({
    where: {
      paintingId: current.paintingId,
      position:
        direction === "up" ? { lt: current.position } : { gt: current.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.image.update({
      where: { id: current.id },
      data: { position: neighbour.position },
    }),
    prisma.image.update({
      where: { id: neighbour.id },
      data: { position: current.position },
    }),
  ]);

  revalidatePath(`/admin/obras/${current.paintingId}`);
  refreshPublicViews();
}

/**
 * Reordena todas las fotos de una obra de una vez, que es lo que hace falta
 * al arrastrar: mover una pieza cambia la posición de varias.
 *
 * Se comprueba que los ids sean exactamente los de esta obra. Sin eso, una
 * petición manipulada podría colar el id de una foto de otra obra y sacarla
 * de su sitio.
 */
export async function reorderImages(
  paintingId: string,
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();

  const actuales = await prisma.image.findMany({
    where: { paintingId },
    select: { id: true },
  });

  const esperados = new Set(actuales.map((imagen) => imagen.id));
  const recibidos = new Set(orderedIds);
  const coinciden =
    esperados.size === recibidos.size &&
    orderedIds.every((id) => esperados.has(id));

  if (!coinciden) return;

  await prisma.$transaction(
    orderedIds.map((id, posicion) =>
      prisma.image.update({ where: { id }, data: { position: posicion } }),
    ),
  );

  revalidatePath(`/admin/obras/${paintingId}`);
  refreshPublicViews();
}

export async function updateImageAlt(
  imageId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const alt = String(formData.get("alt") ?? "").trim() || null;
  const image = await prisma.image.update({
    where: { id: imageId },
    data: { alt },
  });

  revalidatePath(`/admin/obras/${image.paintingId}`);
  refreshPublicViews();
}

export async function movePainting(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  await requireAdmin();

  const current = await prisma.painting.findUniqueOrThrow({ where: { id } });
  const neighbour = await prisma.painting.findFirst({
    where:
      direction === "up"
        ? { position: { lt: current.position } }
        : { position: { gt: current.position } },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.painting.update({
      where: { id: current.id },
      data: { position: neighbour.position },
    }),
    prisma.painting.update({
      where: { id: neighbour.id },
      data: { position: current.position },
    }),
  ]);

  refreshPublicViews();
}

/**
 * Reordena las obras destacadas para la portada, sin tocar `position` (el
 * orden de /galeria). Mismo criterio de seguridad que `reorderImages`: se
 * comprueba que los ids recibidos sean exactamente los de las destacadas
 * actuales antes de escribir nada.
 */
export async function reorderFeaturedPaintings(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  const actuales = await prisma.painting.findMany({
    where: { featured: true, deletedAt: null },
    select: { id: true },
  });

  const esperados = new Set(actuales.map((obra) => obra.id));
  const recibidos = new Set(orderedIds);
  const coinciden =
    esperados.size === recibidos.size &&
    orderedIds.every((id) => esperados.has(id));

  if (!coinciden) return;

  await prisma.$transaction(
    orderedIds.map((id, posicion) =>
      prisma.painting.update({
        where: { id },
        data: { featuredPosition: posicion },
      }),
    ),
  );

  refreshPublicViews();
}

export async function updateArtist(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = artistSchema.safeParse({
    name: formData.get("name"),
    statement: formData.get("statement") ?? "",
    bio: formData.get("bio") ?? "",
    email: formData.get("email") ?? "",
    instagram: formData.get("instagram") ?? "",
    showSoldPaintings: formData.get("showSoldPaintings") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  await prisma.artist.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  refreshArtist();
  // El interruptor de vendidas cambia lo que ve todo el catálogo.
  refreshPublicViews();
  return { ok: true };
}

export async function uploadArtistPortrait(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen" };
  }

  const existing = await prisma.artist.findUnique({
    where: { id: "singleton" },
    select: { portraitPath: true },
  });

  const portraitId = randomUUID();
  let stored;
  try {
    stored = await storeArtistPortrait({
      buffer: Buffer.from(await file.arrayBuffer()),
      portraitId,
      uploadsDir: uploadsDir(),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo procesar",
    };
  }

  const portraitFields = {
    portraitPath: stored.basePath,
    portraitWidth: stored.width,
    portraitHeight: stored.height,
    portraitWidths: stored.widths,
    portraitBlurDataUrl: stored.blurDataUrl,
  };

  await prisma.artist.upsert({
    where: { id: "singleton" },
    update: portraitFields,
    create: { id: "singleton", name: "", ...portraitFields },
  });

  // Se borra después de guardar el nuevo: si el borrado fallara, la artista
  // no se queda sin retrato por el camino.
  if (existing?.portraitPath) {
    await deleteUploads(uploadsDir(), existing.portraitPath);
  }

  refreshArtist();
  return { ok: true };
}

export async function deleteArtistPortrait(): Promise<void> {
  await requireAdmin();

  const artist = await prisma.artist.findUnique({
    where: { id: "singleton" },
    select: { portraitPath: true },
  });
  if (!artist?.portraitPath) return;

  await prisma.artist.update({
    where: { id: "singleton" },
    data: {
      portraitPath: null,
      portraitWidth: null,
      portraitHeight: null,
      portraitWidths: [],
      portraitBlurDataUrl: null,
    },
  });
  await deleteUploads(uploadsDir(), artist.portraitPath);

  refreshArtist();
}
