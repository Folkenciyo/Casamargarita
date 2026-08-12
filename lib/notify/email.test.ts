import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "test" });
const createTransport = vi.fn(() => ({ sendMail }));

// Sin esto el test abriría una conexión SMTP real. Se exponen tanto
// `default.createTransport` como `createTransport` porque no controlamos qué
// forma de interop CJS/ESM usa Vite para resolver `import nodemailer from`.
vi.mock("nodemailer", () => ({
  createTransport,
  default: { createTransport },
}));

const {
  buildInquiryEmail,
  isEmailNotificationConfigured,
  sendInquiryNotification,
} = await import("./email");

const ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

let savedEnv: Record<(typeof ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as typeof savedEnv;
  for (const key of ENV_KEYS) delete process.env[key];
  sendMail.mockClear();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("buildInquiryEmail", () => {
  it("menciona la obra cuando la consulta viene de una ficha", () => {
    const { subject, text } = buildInquiryEmail({
      to: "artista@example.com",
      senderName: "Marta",
      senderEmail: "marta@example.com",
      message: "¿Sigue disponible?",
      paintingTitle: "Luz de tarde",
    });

    expect(subject).toBe("Nueva consulta: Luz de tarde");
    expect(text).toContain("Marta (marta@example.com)");
    expect(text).toContain("«Luz de tarde»");
    expect(text).toContain("¿Sigue disponible?");
  });

  it("sin obra asociada usa un asunto y un texto genéricos", () => {
    const { subject, text } = buildInquiryEmail({
      to: "artista@example.com",
      senderName: "Marta",
      senderEmail: "marta@example.com",
      message: "Hola",
      paintingTitle: null,
    });

    expect(subject).toBe("Nueva consulta");
    expect(text).toContain("a través de la web");
  });
});

describe("isEmailNotificationConfigured", () => {
  it("false si falta cualquiera de las tres variables", () => {
    expect(isEmailNotificationConfigured()).toBe(false);

    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "artista@gmail.com";
    expect(isEmailNotificationConfigured()).toBe(false); // falta SMTP_PASS
  });

  it("true con las tres presentes", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "artista@gmail.com";
    process.env.SMTP_PASS = "contraseña-de-aplicación";
    expect(isEmailNotificationConfigured()).toBe(true);
  });
});

describe("sendInquiryNotification", () => {
  it("no intenta enviar nada si SMTP no está configurado", async () => {
    await sendInquiryNotification({
      to: "artista@example.com",
      senderName: "Marta",
      senderEmail: "marta@example.com",
      message: "Hola",
    });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("envía usando SMTP_USER como remitente si no hay SMTP_FROM", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "artista@gmail.com";
    process.env.SMTP_PASS = "contraseña-de-aplicación";

    await sendInquiryNotification({
      to: "artista@example.com",
      senderName: "Marta",
      senderEmail: "marta@example.com",
      message: "¿Sigue disponible?",
      paintingTitle: "Luz de tarde",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "artista@gmail.com",
        to: "artista@example.com",
        replyTo: "marta@example.com",
        subject: "Nueva consulta: Luz de tarde",
      }),
    );
  });

  it("usa SMTP_FROM como remitente cuando está presente", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "artista@gmail.com";
    process.env.SMTP_PASS = "contraseña-de-aplicación";
    process.env.SMTP_FROM = "avisos@dominio-propio.com";

    await sendInquiryNotification({
      to: "artista@example.com",
      senderName: "Marta",
      senderEmail: "marta@example.com",
      message: "Hola",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "avisos@dominio-propio.com" }),
    );
  });
});
