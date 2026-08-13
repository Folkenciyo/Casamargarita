"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { uniqueSlug } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { seriesSchema } from "@/lib/validation/painting";
import type { ActionState } from "./actions";

function refrescar(slug?: string) {
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin/series");
  if (slug) revalidatePath(`/serie/${slug}`);
}

function campos(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    published: formData.get("published") === "on",
  };
}

export async function createSeries(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = seriesSchema.safeParse(campos(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const slug = await uniqueSlug(parsed.data.title, async (candidato) =>
    Boolean(await prisma.series.findUnique({ where: { slug: candidato } })),
  );
  const ultima = await prisma.series.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.series.create({
    data: { ...parsed.data, slug, position: (ultima?.position ?? -1) + 1 },
  });

  refrescar(slug);
  redirect("/admin/series");
}

export async function updateSeries(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = seriesSchema.safeParse(campos(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const serie = await prisma.series.update({ where: { id }, data: parsed.data });

  refrescar(serie.slug);
  return { ok: true };
}

/**
 * Borrar una serie deshace la agrupación y nada más: las obras se quedan
 * donde estaban, sin serie. Lo garantiza el `onDelete: SetNull` del esquema,
 * pero conviene que también lo diga el código que lo llama.
 */
export async function deleteSeries(id: string): Promise<void> {
  await requireAdmin();

  const serie = await prisma.series.delete({ where: { id } });

  refrescar(serie.slug);
  redirect("/admin/series");
}
