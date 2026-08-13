"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { CACHE_TAGS, invalidar } from "@/lib/cache";
import { uniqueSlug } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  deleteUploads,
  storeJournalImage,
  uploadsDir,
} from "@/lib/images/pipeline";
import { journalSchema } from "@/lib/validation/painting";
import type { ActionState } from "./actions";

function refrescar(slug?: string) {
  // La cabecera del sitio enseña el enlace al diario solo si hay algo
  // publicado, así que la primera entrada cambia todas las páginas.
  invalidar(CACHE_TAGS.journal);
  revalidatePath("/diario");
  revalidatePath("/admin/diario");
  if (slug) revalidatePath(`/diario/${slug}`);
}

function campos(formData: FormData) {
  return {
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    body: formData.get("body") ?? "",
    published: formData.get("published") === "on",
    publishedAt: formData.get("publishedAt") ?? "",
    paintingId: formData.get("paintingId") ?? "",
  };
}

/** La obra enlazada puede haberse borrado desde otra pestaña. */
async function obraInexistente(paintingId: string | null): Promise<boolean> {
  if (!paintingId) return false;
  return !(await prisma.painting.findFirst({
    where: { id: paintingId, deletedAt: null },
    select: { id: true },
  }));
}

const OBRA_PERDIDA = "Esa obra ya no está. Vuelve a elegir una.";

export async function createJournalEntry(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = journalSchema.safeParse(campos(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  if (await obraInexistente(parsed.data.paintingId)) {
    return { error: OBRA_PERDIDA };
  }

  const slug = await uniqueSlug(parsed.data.title, async (candidato) =>
    Boolean(await prisma.journalEntry.findUnique({ where: { slug: candidato } })),
  );

  const entrada = await prisma.journalEntry.create({
    data: { ...parsed.data, slug },
  });

  refrescar(slug);
  redirect(`/admin/diario/${entrada.id}`);
}

export async function updateJournalEntry(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = journalSchema.safeParse(campos(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  if (await obraInexistente(parsed.data.paintingId)) {
    return { error: OBRA_PERDIDA };
  }

  const entrada = await prisma.journalEntry.update({
    where: { id },
    data: parsed.data,
  });

  refrescar(entrada.slug);
  return { ok: true };
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await requireAdmin();

  const entrada = await prisma.journalEntry.delete({ where: { id } });
  // Las filas de JournalImage caen por Cascade; los ficheros, a mano.
  await deleteUploads(uploadsDir(), `journal/${id}`);

  refrescar(entrada.slug);
  redirect("/admin/diario");
}

export async function uploadJournalImage(
  entryId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen" };
  }

  const entrada = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: { slug: true, _count: { select: { images: true } } },
  });
  if (!entrada) return { error: "La entrada ya no existe" };

  const imageId = randomUUID();
  let guardada;
  try {
    guardada = await storeJournalImage({
      buffer: Buffer.from(await file.arrayBuffer()),
      entryId,
      imageId,
      uploadsDir: uploadsDir(),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo procesar",
    };
  }

  await prisma.journalImage.create({
    data: {
      id: imageId,
      entryId,
      basePath: guardada.basePath,
      width: guardada.width,
      height: guardada.height,
      widths: guardada.widths,
      blurDataUrl: guardada.blurDataUrl,
      caption: String(formData.get("caption") ?? ""),
      position: entrada._count.images,
    },
  });

  revalidatePath(`/admin/diario/${entryId}`);
  refrescar(entrada.slug);
  return { ok: true };
}

export async function updateJournalCaption(
  imageId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const imagen = await prisma.journalImage.update({
    where: { id: imageId },
    data: {
      caption: String(formData.get("caption") ?? "").trim(),
      alt: String(formData.get("alt") ?? "").trim() || null,
    },
  });

  revalidatePath(`/admin/diario/${imagen.entryId}`);
  refrescar();
}

export async function deleteJournalImage(imageId: string): Promise<void> {
  await requireAdmin();

  const imagen = await prisma.journalImage.delete({ where: { id: imageId } });
  await deleteUploads(uploadsDir(), imagen.basePath);

  revalidatePath(`/admin/diario/${imagen.entryId}`);
  refrescar();
}
