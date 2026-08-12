import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "art_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type Session = { email: string; role: "admin" };

/**
 * Compatible con el runtime Edge (middleware): jose usa WebCrypto.
 * El secreto se lee en cada llamada para que los tests puedan cambiarlo.
 */
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente o demasiado corto (mínimo 32 caracteres)",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(
  email: string,
  expiresIn: string = `${SESSION_MAX_AGE_SECONDS}s`,
): Promise<string> {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

/** Devuelve null ante cualquier problema: firma, caducidad o formato. */
export async function readSession(
  token: string | undefined | null,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin" || typeof payload.email !== "string") {
      return null;
    }
    return { email: payload.email, role: "admin" };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
