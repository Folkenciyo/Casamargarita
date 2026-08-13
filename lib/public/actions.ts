"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { consumeAttempt } from "@/lib/auth/rate-limit";
import { commissionSchema } from "@/lib/commissions";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
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
      log.error("aviso de consulta: no se pudo enviar el email", error, {
        paintingId,
      });
    });
}

/**
 * Petición de encargo. Mismo limitador y misma trampa para bots que las
 * consultas, y el mismo criterio: se guarda primero y se avisa después.
 */
export async function sendCommission(
  _state: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "desconocida";
  if (!consumeAttempt(`commission:${ip}`).allowed) {
    return { error: "Has enviado varias peticiones seguidas. Prueba más tarde." };
  }

  const parsed = commissionSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    brief: formData.get("brief"),
    widthCm: formData.get("widthCm") ?? "",
    heightCm: formData.get("heightCm") ?? "",
    deadline: formData.get("deadline") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  }

  const { website: _honeypot, ...datos } = parsed.data;
  await prisma.commission.create({ data: datos });

  revalidatePath("/admin/encargos");
  revalidatePath("/admin");
  avisarDeEncargo(datos);
  return { ok: true };
}

/** Sin `await`, por lo mismo que en las consultas. */
function avisarDeEncargo(encargo: {
  name: string;
  email: string;
  brief: string;
}): void {
  prisma.artist
    .findUnique({ where: { id: "singleton" }, select: { email: true } })
    .then((artist) => {
      if (!artist?.email) return null;
      return sendInquiryNotification({
        to: artist.email,
        senderName: encargo.name,
        senderEmail: encargo.email,
        message: encargo.brief,
        paintingTitle: "Petición de encargo",
      });
    })
    .catch((error: unknown) => {
      log.error("aviso de encargo: no se pudo enviar el email", error);
    });
}

export async function markInquiryRead(id: string): Promise<void> {
  await requireAdmin();

  await prisma.inquiry.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin/consultas");
  revalidatePath("/admin");
}

/**
 * Contestada. Marca también como leída: no tendría sentido haber respondido
 * algo sin haberlo leído, y ahorra un clic.
 */
export async function toggleInquiryAnswered(id: string): Promise<void> {
  await requireAdmin();

  const actual = await prisma.inquiry.findUniqueOrThrow({
    where: { id },
    select: { answeredAt: true },
  });

  await prisma.inquiry.update({
    where: { id },
    data: actual.answeredAt
      ? { answeredAt: null }
      : { answeredAt: new Date(), readAt: new Date() },
  });

  revalidatePath("/admin/consultas");
  revalidatePath("/admin");
}

export async function toggleCommissionAnswered(id: string): Promise<void> {
  await requireAdmin();

  const actual = await prisma.commission.findUniqueOrThrow({
    where: { id },
    select: { answeredAt: true },
  });

  await prisma.commission.update({
    where: { id },
    data: actual.answeredAt
      ? { answeredAt: null }
      : { answeredAt: new Date(), readAt: new Date() },
  });

  revalidatePath("/admin/encargos");
  revalidatePath("/admin");
}

/**
 * Nota privada de la artista sobre una consulta. Devuelve estado para poder
 * acusar recibo: escribir algo y no ver ninguna señal de que se ha guardado
 * es la peor manera de perder una nota.
 */
export async function saveInquiryNote(
  id: string,
  _state: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  await requireAdmin();

  const nota = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 2000);

  await prisma.inquiry.update({ where: { id }, data: { note: nota } });
  revalidatePath("/admin/consultas");
  return { ok: true };
}
