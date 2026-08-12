"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { consumeAttempt } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";
import { sendInquiryNotification } from "@/lib/notify/email";
import { inquirySchema } from "@/lib/validation/painting";

export type InquiryState = { error?: string; ok?: boolean };

export async function sendInquiry(
  paintingId: string | null,
  _state: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  // Mismo limitador que el login: 5 envíos por IP cada 15 minutos.
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "desconocida";
  if (!consumeAttempt(`inquiry:${ip}`).allowed) {
    return { error: "Has enviado varias consultas seguidas. Prueba más tarde." };
  }

  const parsed = inquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  }

  await prisma.inquiry.create({
    data: {
      paintingId,
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
    },
  });

  revalidatePath("/admin/consultas");
  notifyArtist(paintingId, parsed.data);
  return { ok: true };
}

/**
 * Sin `await`: la consulta ya se guardó, el visitante no debe esperar (ni
 * ver fallar su envío) a que salga un correo. Seguro aquí porque la app
 * corre como proceso Node de larga vida (Docker/Dokploy), no en una función
 * serverless que se cortaría al responder.
 */
function notifyArtist(
  paintingId: string | null,
  inquiry: { name: string; email: string; message: string },
): void {
  Promise.all([
    prisma.artist.findUnique({ where: { id: "singleton" }, select: { email: true } }),
    paintingId
      ? prisma.painting.findUnique({ where: { id: paintingId }, select: { title: true } })
      : null,
  ])
    .then(([artist, painting]) => {
      if (!artist?.email) return null;
      return sendInquiryNotification({
        to: artist.email,
        senderName: inquiry.name,
        senderEmail: inquiry.email,
        message: inquiry.message,
        paintingTitle: painting?.title ?? null,
      });
    })
    .catch((error: unknown) => {
      console.error("aviso de consulta: no se pudo enviar el email", error);
    });
}

export async function markInquiryRead(id: string): Promise<void> {
  await requireAdmin();

  await prisma.inquiry.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin/consultas");
}
