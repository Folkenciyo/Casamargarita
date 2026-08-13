import nodemailer from "nodemailer";

/**
 * Aviso por email a la artista cuando llega una consulta. Pensado para SMTP
 * de una cuenta de Gmail: host smtp.gmail.com, puerto 465, y una contraseña
 * de aplicación (no la contraseña normal de la cuenta, Gmail la rechaza para
 * SMTP si hay verificación en dos pasos).
 *
 * Sin las variables SMTP_HOST/SMTP_USER/SMTP_PASS no se envía nada: no es un
 * error, es el estado por defecto hasta que alguien las configure.
 */

export type InquiryEmailInput = {
  to: string;
  senderName: string;
  senderEmail: string;
  message: string;
  paintingTitle?: string | null;
};

export function isEmailNotificationConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export function buildInquiryEmail(
  input: InquiryEmailInput,
): { subject: string; text: string } {
  const subject = input.paintingTitle
    ? `Nueva consulta: ${input.paintingTitle}`
    : "Nueva consulta";

  const about = input.paintingTitle
    ? `sobre «${input.paintingTitle}»`
    : "a través de la web";

  const text = `${input.senderName} (${input.senderEmail}) escribe ${about}:\n\n${input.message}`;

  return { subject, text };
}

let cachedTransport: nodemailer.Transporter | null = null;

function transport(): nodemailer.Transporter {
  // Un único transporte reutilizado: crear uno por email abriría y cerraría
  // la conexión SMTP en cada consulta.
  cachedTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? "465") === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransport;
}

/**
 * No lanza si SMTP no está configurado: es el modo por defecto. Si está
 * configurado y el envío falla, sí lanza — quien llama decide si eso debe
 * impedir algo o solo quedar registrado.
 */
export async function sendInquiryNotification(
  input: InquiryEmailInput,
): Promise<void> {
  if (!isEmailNotificationConfigured()) return;

  const { subject, text } = buildInquiryEmail(input);

  await transport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: input.to,
    replyTo: input.senderEmail,
    subject,
    text,
  });
}

/**
 * Correo genérico en texto plano, para lo que no es una consulta: la
 * confirmación del aviso de obra nueva, por ejemplo. Mismo criterio que
 * arriba: sin SMTP configurado no hace nada en lugar de fallar.
 */
export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!isEmailNotificationConfigured()) return;

  await transport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
