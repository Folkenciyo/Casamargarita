"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { uniqueSlug } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  deleteUploads,
  storeArtistPortrait,
  storePaintingImage,
  uploadsDir,
} from "@/lib/images/pipeline";
import { artistSchema, paintingSchema } from "@/lib/validation/painting";

export type ActionState = { error?: string; ok?: boolean };

function refreshPublicViews(slug?: string) {
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  revalidatePath("/admin/obras");
  if (slug) revalidatePath(`/obra/${slug}`);
}

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

  const painting = await prisma.painting.findUnique({
    where: { id: paintingId },
    select: { slug: true, _count: { select: { images: true } } },
  });
  if (!painting) return { error: "La obra ya no existe" };

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
      alt: String(formData.get("alt") ?? "") || null,
      isPrimary: painting._count.images === 0,
      position: painting._count.images,
    },
  });

  refreshPublicViews(painting.slug);
  return { ok: true };
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

  revalidatePath("/artista");
  revalidatePath("/admin/artista");
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

  revalidatePath("/artista");
  revalidatePath("/admin/artista");
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

  revalidatePath("/artista");
  revalidatePath("/admin/artista");
}
