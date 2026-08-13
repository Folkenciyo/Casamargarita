import { z } from "zod";

/**
 * Aviso de obra nueva.
 *
 * **Nace apagado.** Sin `NEWSLETTER_ENABLED=true` el formulario no aparece en
 * la web y las acciones se niegan a guardar nada. Es deliberado: una lista de
 * correo obliga a publicar quién es el responsable del tratamiento y una
 * política de privacidad, y esos textos los tiene que escribir la artista, no
 * yo. Encenderlo sin eso sería incumplir el RGPD con buena letra.
 */
export function newsletterActivada(): boolean {
  return process.env.NEWSLETTER_ENABLED === "true";
}

export const subscribeSchema = z.object({
  email: z.string().email("Correo no válido"),
  // Hay que marcarla; sin consentimiento explícito no hay lista.
  consent: z.literal(true, { message: "Tienes que aceptar para poder avisarte" }),
  website: z.string().max(0, "Envío rechazado").optional().default(""),
});

/** Token opaco para los enlaces de confirmación y de baja. */
export function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function enlaceConfirmacion(base: string, token: string): string {
  return `${base}/avisos/confirmar?t=${token}`;
}

export function enlaceBaja(base: string, token: string): string {
  return `${base}/avisos/baja?t=${token}`;
}
