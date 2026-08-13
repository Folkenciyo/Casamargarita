import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enlaceBaja,
  enlaceConfirmacion,
  newsletterActivada,
  nuevoToken,
  subscribeSchema,
} from "./newsletter";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("newsletterActivada", () => {
  /**
   * Lo importante de este interruptor: por defecto está apagado. Una lista de
   * correo sin política de privacidad publicada es un problema legal, no una
   * función a medias.
   */
  it("está apagada si nadie la enciende", () => {
    vi.stubEnv("NEWSLETTER_ENABLED", "");
    expect(newsletterActivada()).toBe(false);
  });

  it("solo se enciende con el valor exacto", () => {
    vi.stubEnv("NEWSLETTER_ENABLED", "1");
    expect(newsletterActivada()).toBe(false);
    vi.stubEnv("NEWSLETTER_ENABLED", "yes");
    expect(newsletterActivada()).toBe(false);
    vi.stubEnv("NEWSLETTER_ENABLED", "true");
    expect(newsletterActivada()).toBe(true);
  });
});

describe("subscribeSchema", () => {
  it("acepta un alta con consentimiento", () => {
    expect(
      subscribeSchema.parse({ email: "ana@example.com", consent: true }).email,
    ).toBe("ana@example.com");
  });

  it("no hay alta sin marcar la casilla", () => {
    expect(() =>
      subscribeSchema.parse({ email: "ana@example.com", consent: false }),
    ).toThrow();
    expect(() =>
      subscribeSchema.parse({ email: "ana@example.com" }),
    ).toThrow();
  });

  it("rechaza un correo mal escrito", () => {
    expect(() =>
      subscribeSchema.parse({ email: "arroba", consent: true }),
    ).toThrow();
  });

  it("rechaza el envío si el honeypot viene relleno", () => {
    expect(() =>
      subscribeSchema.parse({
        email: "ana@example.com",
        consent: true,
        website: "http://spam.test",
      }),
    ).toThrow();
  });
});

describe("tokens y enlaces", () => {
  it("no repite tokens", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => nuevoToken()));
    expect(tokens.size).toBe(200);
  });

  it("el token es suficientemente largo para no adivinarse", () => {
    expect(nuevoToken()).toMatch(/^[0-9a-f]{48}$/);
  });

  it("los enlaces llevan el token y apuntan a su página", () => {
    const token = nuevoToken();
    expect(enlaceConfirmacion("https://x.test", token)).toBe(
      `https://x.test/avisos/confirmar?t=${token}`,
    );
    expect(enlaceBaja("https://x.test", token)).toBe(
      `https://x.test/avisos/baja?t=${token}`,
    );
  });
});
