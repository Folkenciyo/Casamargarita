import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { clearAttempts, consumeAttempt } from "@/lib/auth/rate-limit";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { clientIp, forbiddenIfCrossOrigin } from "@/lib/http/origin";

// argon2 es un binario nativo: esta ruta no puede correr en Edge.
export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Mismo mensaje para usuario inexistente y contraseña incorrecta.
const GENERIC_ERROR = "Credenciales incorrectas";

export async function POST(request: Request) {
  const crossOrigin = forbiddenIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limit = consumeAttempt(clientIp(request));
  if (!limit.allowed) {
    return Response.json(
      { error: "Demasiados intentos. Prueba de nuevo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const expectedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const emailMatches = parsed.data.email.toLowerCase() === expectedEmail;
  // Se verifica el hash aunque el email no cuadre: mismo coste temporal
  // en ambos casos, no se filtra qué parte ha fallado.
  const passwordMatches = await verifyPassword(
    parsed.data.password,
    process.env.ADMIN_PASSWORD_HASH,
  );

  if (!expectedEmail || !emailMatches || !passwordMatches) {
    return Response.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  clearAttempts(clientIp(request));
  const token = await createSession(expectedEmail);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());

  return Response.json({ ok: true });
}
