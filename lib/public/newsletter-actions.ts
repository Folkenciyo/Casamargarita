"use server";

import { headers } from "next/headers";
import { consumeAttempt } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import {
  enlaceBaja,
  enlaceConfirmacion,
  newsletterActivada,
  nuevoToken,
  subscribeSchema,
} from "@/lib/newsletter";
import { sendMail } from "@/lib/notify/email";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { InquiryState } from "./actions";

/**
 * Alta en el aviso de obra nueva, con doble confirmación.
 *
 * Siempre responde lo mismo, exista o no el correo en la lista: si dijera
 * "ya estabas apuntada", cualquiera podría comprobar si una dirección está
 * suscrita.
 */
export async function subscribe(
  _state: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  if (!newsletterActivada()) {
    return { error: "Los avisos no están disponibles ahora mismo." };
  }

  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "desconocida";
  if (!consumeAttempt(`subscribe:${ip}`).allowed) {
    return { error: "Demasiados intentos. Prueba dentro de un rato." };
  }

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    consent: formData.get("consent") === "on",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  }

  const email = parsed.data.email.toLowerCase();
  const token = nuevoToken();
  const existente = await prisma.subscriber.findUnique({ where: { email } });

  // Ya confirmada: no se hace nada y se responde igual que a un alta nueva.
  if (!existente?.confirmedAt) {
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, token, lang: String(formData.get("lang") ?? "es") },
      update: { token },
    });

    enviarConfirmacion(email, token).catch((error: unknown) => {
      log.error("aviso de obra nueva: no se pudo enviar la confirmación", error);
    });
  }

  return { ok: true };
}

async function enviarConfirmacion(email: string, token: string): Promise<void> {
  await sendMail({
    to: email,
    subject: `Confirma que quieres recibir avisos de ${SITE_NAME}`,
    text: [
      "Alguien —esperamos que tú— ha pedido recibir un aviso cuando haya obra nueva.",
      "",
      "Para confirmarlo, abre este enlace:",
      enlaceConfirmacion(SITE_URL, token),
      "",
      "Si no has sido tú, no hagas nada: sin confirmar no se envía nada.",
      "",
      `Podrás darte de baja cuando quieras: ${enlaceBaja(SITE_URL, token)}`,
    ].join("\n"),
  });
}

/** Confirma un alta a partir del token del correo. */
export async function confirmSubscription(token: string): Promise<boolean> {
  if (!newsletterActivada()) return false;

  const suscriptor = await prisma.subscriber.findUnique({ where: { token } });
  if (!suscriptor) return false;
  if (suscriptor.confirmedAt) return true;

  await prisma.subscriber.update({
    where: { id: suscriptor.id },
    data: { confirmedAt: new Date() },
  });

  return true;
}

/** Baja inmediata, sin pedir nada más: el enlace del correo basta. */
export async function unsubscribe(token: string): Promise<boolean> {
  const suscriptor = await prisma.subscriber.findUnique({ where: { token } });
  if (!suscriptor) return false;

  await prisma.subscriber.delete({ where: { id: suscriptor.id } });
  return true;
}
