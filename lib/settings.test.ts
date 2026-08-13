import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { artist: { findUnique } } }));

// Fuera del servidor de Next no hay caché de datos donde guardar nada y
// `unstable_cache` avisa lanzando. Aquí se prueba la lógica; que la consulta
// se registre con su etiqueta lo comprueba lib/cache.test.ts.
vi.mock("@/lib/cache", () => ({
  CACHE_TAGS: { artist: "artist" },
  cacheado: (
    _clave: string,
    _tags: readonly string[],
    consulta: (...args: unknown[]) => Promise<unknown>,
  ) => consulta,
}));

const { getSiteSettings, publicPaintingWhere } = await import("./settings");

beforeEach(() => {
  findUnique.mockReset();
});

describe("getSiteSettings", () => {
  it("devuelve el ajuste guardado", async () => {
    findUnique.mockResolvedValue({ showSoldPaintings: false });

    await expect(getSiteSettings()).resolves.toEqual({
      showSoldPaintings: false,
    });
  });

  // Instalación recién montada: la fila de ajustes todavía no existe y el
  // público no puede ver un error por eso.
  it("cae en los valores por defecto si no hay ficha de artista", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getSiteSettings()).resolves.toEqual({
      showSoldPaintings: true,
    });
  });
});

describe("publicPaintingWhere", () => {
  it("con las vendidas visibles filtra por publicada y sin papelera", async () => {
    findUnique.mockResolvedValue({ showSoldPaintings: true });

    await expect(publicPaintingWhere()).resolves.toEqual({
      published: true,
      deletedAt: null,
    });
  });

  it("con las vendidas ocultas añade el descarte de SOLD", async () => {
    findUnique.mockResolvedValue({ showSoldPaintings: false });

    await expect(publicPaintingWhere()).resolves.toEqual({
      published: true,
      deletedAt: null,
      status: { not: "SOLD" },
    });
  });

  it("sin ficha de artista no esconde más de lo debido", async () => {
    findUnique.mockResolvedValue(null);

    await expect(publicPaintingWhere()).resolves.toEqual({
      published: true,
      deletedAt: null,
    });
  });
});
