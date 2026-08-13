import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  paintingWhere,
  paintingsHref,
  parsePaintingFilters,
} from "./painting-filters";

describe("parsePaintingFilters", () => {
  it("sin parámetros no filtra nada", () => {
    expect(parsePaintingFilters({})).toEqual(EMPTY_FILTERS);
  });

  it("lee los cuatro filtros de la URL", () => {
    expect(
      parsePaintingFilters({
        q: "  marina  ",
        estado: "SOLD",
        visibilidad: "ocultas",
        foto: "sin",
        page: "3",
      }),
    ).toEqual({
      q: "marina",
      status: "SOLD",
      visibility: "hidden",
      photo: "without",
      papelera: false,
      page: 3,
    });
  });

  it("descarta un estado que no existe en lugar de fallar", () => {
    expect(parsePaintingFilters({ estado: "ROBADO" }).status).toBeNull();
  });

  it.each(["0", "-2", "1.5", "muchas", ""])(
    "cae en la página 1 con page=%s",
    (page) => {
      expect(parsePaintingFilters({ page }).page).toBe(1);
    },
  );
});

describe("hasActiveFilters", () => {
  it("es falso sin filtros", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  // La página no cuenta: pasar de página no es filtrar, y con la lista
  // paginada el reordenado tiene que seguir funcionando.
  it("no considera filtro estar en la página 2", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, page: 2 })).toBe(false);
  });

  it.each([
    ["búsqueda", { q: "marina" }],
    ["estado", { status: "SOLD" as const }],
    ["visibilidad", { visibility: "hidden" as const }],
    ["foto", { photo: "without" as const }],
  ])("detecta el filtro de %s", (_label, override) => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, ...override })).toBe(true);
  });
});

describe("paintingWhere", () => {
  /**
   * Lo que no puede fallar nunca: sin pedir la papelera, la papelera no sale.
   * Si esto se rompiera, la obra que la artista tiró reaparecería en la lista
   * como si nada.
   */
  it("siempre descarta la papelera salvo que se pida", () => {
    expect(paintingWhere(EMPTY_FILTERS)).toEqual({ deletedAt: null });
    expect(paintingWhere({ ...EMPTY_FILTERS, papelera: true })).toEqual({
      deletedAt: { not: null },
    });
  });

  it("la papelera manda aunque haya otros filtros puestos", () => {
    const where = paintingWhere({
      ...EMPTY_FILTERS,
      papelera: true,
      q: "marina",
      visibility: "published",
    });

    expect(where.deletedAt).toEqual({ not: null });
  });

  it("busca por título sin distinguir mayúsculas", () => {
    expect(paintingWhere({ ...EMPTY_FILTERS, q: "Marina" })).toMatchObject({
      title: { contains: "Marina", mode: "insensitive" },
    });
  });

  it("traduce visibilidad a published", () => {
    expect(
      paintingWhere({ ...EMPTY_FILTERS, visibility: "published" }),
    ).toMatchObject({ published: true });
    expect(
      paintingWhere({ ...EMPTY_FILTERS, visibility: "hidden" }),
    ).toMatchObject({ published: false });
  });

  it("traduce el filtro de foto a una relación", () => {
    expect(paintingWhere({ ...EMPTY_FILTERS, photo: "without" })).toMatchObject({
      images: { none: {} },
    });
    expect(paintingWhere({ ...EMPTY_FILTERS, photo: "with" })).toMatchObject({
      images: { some: {} },
    });
  });

  it("combina varios filtros", () => {
    expect(
      paintingWhere({
        q: "marina",
        status: "AVAILABLE",
        visibility: "published",
        photo: "with",
        papelera: false,
        page: 2,
      }),
    ).toEqual({
      deletedAt: null,
      title: { contains: "marina", mode: "insensitive" },
      status: "AVAILABLE",
      published: true,
      images: { some: {} },
    });
  });
});

describe("paintingsHref", () => {
  it("sin filtros es la ruta limpia", () => {
    expect(paintingsHref(EMPTY_FILTERS)).toBe("/admin/obras");
  });

  it("omite la página 1", () => {
    expect(paintingsHref({ ...EMPTY_FILTERS, page: 1 })).toBe("/admin/obras");
    expect(paintingsHref({ ...EMPTY_FILTERS, page: 2 })).toBe(
      "/admin/obras?page=2",
    );
  });

  it("conserva los filtros al cambiar de página", () => {
    expect(
      paintingsHref(
        { ...EMPTY_FILTERS, q: "marina", status: "SOLD" },
        { page: 3 },
      ),
    ).toBe("/admin/obras?q=marina&estado=SOLD&page=3");
  });

  it("vuelve a escribir los valores en castellano de la URL", () => {
    expect(
      paintingsHref({
        ...EMPTY_FILTERS,
        visibility: "hidden",
        photo: "without",
      }),
    ).toBe("/admin/obras?visibilidad=ocultas&foto=sin");
  });

  // Ida y vuelta: lo que escribe paintingsHref lo tiene que leer el parser.
  it("produce URLs que el propio parser entiende", () => {
    const filters = {
      q: "óleo & lienzo",
      status: "RESERVED" as const,
      visibility: "published" as const,
      photo: "with" as const,
      papelera: true,
      page: 4,
    };
    const url = new URL(paintingsHref(filters), "http://localhost");
    const params = Object.fromEntries(url.searchParams);

    expect(parsePaintingFilters(params)).toEqual(filters);
  });
});
