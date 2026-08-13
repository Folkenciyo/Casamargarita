import { beforeEach, describe, expect, it, vi } from "vitest";

type Consulta = (...args: never[]) => Promise<unknown>;

// El envoltorio de Next se sustituye por la identidad: aquí se comprueba con
// qué se registra cada consulta, no que Next sepa cachear.
const unstableCache = vi.fn(
  (cb: Consulta, _keyParts?: string[], _options?: unknown) => cb,
);
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (cb: Consulta, keyParts?: string[], options?: unknown) =>
    unstableCache(cb, keyParts, options),
  revalidateTag: (tag: string) => revalidateTag(tag),
}));

const { CACHE_TAGS, CACHE_TTL_SECONDS, cacheado, invalidar } = await import(
  "./cache"
);

beforeEach(() => {
  unstableCache.mockClear();
  revalidateTag.mockClear();
});

describe("cacheado", () => {
  it("registra la consulta con su clave, sus etiquetas y el techo de frescura", () => {
    const consulta = async () => "obra";

    cacheado("obra-por-slug", [CACHE_TAGS.paintings, CACHE_TAGS.series], consulta);

    expect(unstableCache).toHaveBeenCalledWith(consulta, ["obra-por-slug"], {
      tags: ["paintings", "series"],
      revalidate: CACHE_TTL_SECONDS,
    });
  });

  it("deja pasar los argumentos y el resultado sin tocarlos", async () => {
    const consulta = vi.fn(async (slug: string, pagina: number) =>
      `${slug}:${pagina}`,
    );

    const envuelta = cacheado("listado", [CACHE_TAGS.paintings], consulta);

    await expect(envuelta("marinas", 2)).resolves.toBe("marinas:2");
    expect(consulta).toHaveBeenCalledWith("marinas", 2);
  });
});

describe("invalidar", () => {
  it("caduca cada etiqueta que se le pasa", () => {
    invalidar(CACHE_TAGS.paintings, CACHE_TAGS.series);

    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith("paintings");
    expect(revalidateTag).toHaveBeenCalledWith("series");
  });

  // Las escrituras del panel tocan varias cosas a la vez y es fácil que una
  // etiqueta aparezca dos veces al juntar las listas.
  it("no repite una etiqueta duplicada", () => {
    invalidar(CACHE_TAGS.paintings, CACHE_TAGS.paintings);

    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });
});
