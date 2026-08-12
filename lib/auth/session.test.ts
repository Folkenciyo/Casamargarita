import { beforeAll, describe, expect, it } from "vitest";
import { SESSION_COOKIE, createSession, readSession } from "./session";

const SECRET = "test-secret-test-secret-test-secret-32";

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

describe("sesión de administración", () => {
  it("firma y vuelve a leer el email", async () => {
    const token = await createSession("artista@example.com");
    await expect(readSession(token)).resolves.toMatchObject({
      email: "artista@example.com",
      role: "admin",
    });
  });

  it("rechaza un token manipulado", async () => {
    const token = await createSession("artista@example.com");
    const tampered = `${token.slice(0, -3)}abc`;
    await expect(readSession(tampered)).resolves.toBeNull();
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const token = await createSession("artista@example.com");
    process.env.SESSION_SECRET = "otro-secreto-otro-secreto-otro-32chars";
    await expect(readSession(token)).resolves.toBeNull();
    process.env.SESSION_SECRET = SECRET;
  });

  it("rechaza un token caducado", async () => {
    const token = await createSession("artista@example.com", "-1s");
    await expect(readSession(token)).resolves.toBeNull();
  });

  it("rechaza basura", async () => {
    await expect(readSession("no-es-un-jwt")).resolves.toBeNull();
    await expect(readSession(undefined)).resolves.toBeNull();
  });

  it("usa un nombre de cookie estable", () => {
    expect(SESSION_COOKIE).toBe("art_session");
  });
});
