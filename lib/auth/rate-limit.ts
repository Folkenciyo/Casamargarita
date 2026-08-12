// Ventana deslizante en memoria. Suficiente para una sola instancia, que es
// lo que despliega Dokploy aquí. Si algún día hay réplicas, esto se mueve a Redis.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function consumeAttempt(key: string): RateLimitResult {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    };
  }

  recent.push(now);
  attempts.set(key, recent);
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - recent.length,
    retryAfterSeconds: 0,
  };
}

/** Tras un login correcto se limpia el contador de esa IP. */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export function resetAttempts(): void {
  attempts.clear();
}
