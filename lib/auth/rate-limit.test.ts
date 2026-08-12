import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeAttempt, resetAttempts } from "./rate-limit";

describe("rate limit del login", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAttempts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta 5 intentos por IP", () => {
    for (let i = 0; i < 5; i += 1) {
      expect(consumeAttempt("10.0.0.1").allowed).toBe(true);
    }
    expect(consumeAttempt("10.0.0.1").allowed).toBe(false);
  });

  it("aísla las IPs entre sí", () => {
    for (let i = 0; i < 5; i += 1) consumeAttempt("10.0.0.1");
    expect(consumeAttempt("10.0.0.2").allowed).toBe(true);
  });

  it("libera la ventana pasados 15 minutos", () => {
    for (let i = 0; i < 5; i += 1) consumeAttempt("10.0.0.1");
    expect(consumeAttempt("10.0.0.1").allowed).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(consumeAttempt("10.0.0.1").allowed).toBe(true);
  });

  it("informa de los segundos que faltan para reintentar", () => {
    for (let i = 0; i < 5; i += 1) consumeAttempt("10.0.0.1");
    const blocked = consumeAttempt("10.0.0.1");
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
  });
});
