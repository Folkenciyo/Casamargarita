import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => ({ get }) }));

const { scriptNonce } = await import("./nonce");

beforeEach(() => {
  get.mockReset();
});

describe("scriptNonce", () => {
  it("devuelve el nonce que puso el middleware", async () => {
    get.mockReturnValue("abc123");

    await expect(scriptNonce()).resolves.toBe("abc123");
    expect(get).toHaveBeenCalledWith("x-nonce");
  });

  /**
   * `undefined` y no cadena vacía: React omite el atributo entero, y un
   * `nonce=""` sería una firma inventada que el navegador rechazaría de todos
   * modos, pero sin dejar claro por qué.
   */
  it("sin nonce en la petición no devuelve nada", async () => {
    get.mockReturnValue(null);

    await expect(scriptNonce()).resolves.toBeUndefined();
  });
});
