import { hash, verify } from "@node-rs/argon2";

// Parámetros OWASP para argon2id (2024): 19 MiB, 2 iteraciones, paralelismo 1.
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// async a propósito: el fallo de validación llega como promesa rechazada,
// igual que cualquier otro error de esta función.
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new RangeError("La contraseña debe tener al menos 12 caracteres");
  }
  return hash(password, OPTIONS);
}

/** Nunca lanza: una comparación fallida y un hash corrupto son lo mismo. */
export async function verifyPassword(
  password: string,
  storedHash: string | undefined,
): Promise<boolean> {
  if (!storedHash) return false;
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
