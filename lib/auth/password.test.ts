import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("contraseñas argon2id", () => {
  it("verifica la contraseña correcta", async () => {
    const stored = await hashPassword("contraseña-de-prueba");
    await expect(verifyPassword("contraseña-de-prueba", stored)).resolves.toBe(
      true,
    );
  });

  it("rechaza la contraseña incorrecta", async () => {
    const stored = await hashPassword("contraseña-de-prueba");
    await expect(verifyPassword("otra-cosa-distinta", stored)).resolves.toBe(
      false,
    );
  });

  it("produce hashes argon2id distintos con el mismo texto (salt aleatorio)", async () => {
    const a = await hashPassword("contraseña-de-prueba");
    const b = await hashPassword("contraseña-de-prueba");
    expect(a).not.toBe(b);
    expect(a.startsWith("$argon2id$")).toBe(true);
  });

  it("no lanza con hash ausente o corrupto", async () => {
    await expect(verifyPassword("x", undefined)).resolves.toBe(false);
    await expect(verifyPassword("x", "no-es-un-hash")).resolves.toBe(false);
  });

  it("exige un mínimo de longitud al crear", async () => {
    await expect(hashPassword("corta")).rejects.toThrow(RangeError);
  });
});
