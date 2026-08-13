"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { MILESTONE_KINDS } from "@/lib/milestones";
import { z } from "zod";
import type { ActionState } from "./actions";

const milestoneSchema = z.object({
  kind: z.enum(MILESTONE_KINDS),
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  place: z.string().trim().max(200).optional().default(""),
  year: z.coerce
    .number({ message: "El año debe ser un número" })
    .int()
    .min(1900, "Año fuera de rango")
    .max(2100, "Año fuera de rango"),
  url: z
    .union([z.literal(""), z.string().url("La dirección no es válida")])
    .optional()
    .default(""),
  published: z.coerce.boolean().default(true),
});

function refrescar() {
  revalidatePath("/artista");
  revalidatePath("/admin/trayectoria");
}

export async function createMilestone(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = milestoneSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    place: formData.get("place") ?? "",
    year: formData.get("year"),
    url: formData.get("url") ?? "",
    published: formData.get("published") !== "off",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const ultimo = await prisma.milestone.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.milestone.create({
    data: { ...parsed.data, position: (ultimo?.position ?? -1) + 1 },
  });

  refrescar();
  return { ok: true };
}

export async function deleteMilestone(id: string): Promise<void> {
  await requireAdmin();

  await prisma.milestone.delete({ where: { id } });
  refrescar();
}

export async function toggleMilestonePublished(id: string): Promise<void> {
  await requireAdmin();

  const actual = await prisma.milestone.findUniqueOrThrow({
    where: { id },
    select: { published: true },
  });
  await prisma.milestone.update({
    where: { id },
    data: { published: !actual.published },
  });

  refrescar();
}
