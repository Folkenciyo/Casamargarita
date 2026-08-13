import { describe, expect, it } from "vitest";
import {
  SIN_FILTROS,
  galeriaHref,
  galeriaWhere,
  hayFiltros,
  parseFiltrosGaleria,
} from "./gallery-filters";

describe("parseFiltrosGaleria", () => {
  it("sin parámetros no filtra nada", () => {
    expect(parseFiltrosGaleria({})).toEqual(SIN_FILTROS);
  });

  it("lee los tres filtros y la página", () => {
    expect(
      parseFiltrosGaleria({
        formato: "grande",
        serie: "marinas-de-invierno",
        disponibles: "si",
        page: "2",
      }),
    ).toEqual({
      formato: "grande",
      serie: "marinas-de-invierno",
      soloDisponibles: true,
      pagina: 2,
    });
  });

  it("descarta un formato inventado en la URL", () => {
    expect(parseFiltrosGaleria({ formato: "gigantesco" }).formato).toBeNull();
  });

  it("solo activa el filtro de disponibles con el valor exacto", () => {
    expect(parseFiltrosGaleria({ disponibles: "true" }).soloDisponibles).toBe(
      false,
    );
    expect(parseFiltrosGaleria({ disponibles: "si" }).soloDisponibles).toBe(true);
  });
});

describe("hayFiltros", () => {
  it("es falso sin filtros y pasar de página no cuenta", () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, pagina: 3 })).toBe(false);
  });

  it("detecta cada uno de los filtros", () => {
    expect(hayFiltros({ ...SIN_FILTROS, formato: "pequeno" })).toBe(true);
    expect(hayFiltros({ ...SIN_FILTROS, serie: "marinas" })).toBe(true);
    expect(hayFiltros({ ...SIN_FILTROS, soloDisponibles: true })).toBe(true);
  });
});

describe("galeriaWhere", () => {
  it("sin filtros no añade condiciones", () => {
    expect(galeriaWhere(SIN_FILTROS, null)).toEqual({});
  });

  it("filtra por la serie resuelta, no por el texto de la URL", () => {
    // El visitante escribe un slug; a Prisma va el id que hemos encontrado.
    expect(
      galeriaWhere({ ...SIN_FILTROS, serie: "marinas-de-invierno" }, "cser123"),
    ).toEqual({ seriesId: "cser123" });
  });

  it("una serie que no existe no filtra por ninguna", () => {
    expect(galeriaWhere({ ...SIN_FILTROS, serie: "inventada" }, null)).toEqual({});
  });

  /**
   * Importa el sentido de la restricción: "solo disponibles" es un
   * subconjunto de lo que ya deja ver el sitio, así que nunca puede destapar
   * obra oculta al combinarse con el filtro de visibilidad.
   */
  it("solo disponibles se queda en el estado AVAILABLE", () => {
    expect(galeriaWhere({ ...SIN_FILTROS, soloDisponibles: true }, null)).toEqual({
      status: "AVAILABLE",
    });
  });

  it("combina tamaño, serie y disponibilidad", () => {
    const where = galeriaWhere(
      {
        formato: "pequeno",
        serie: "marinas",
        soloDisponibles: true,
        pagina: 1,
      },
      "cser123",
    );

    expect(where).toMatchObject({ seriesId: "cser123", status: "AVAILABLE" });
    expect(where).toHaveProperty("widthCm");
  });
});

describe("galeriaHref", () => {
  it("sin filtros es la ruta limpia", () => {
    expect(galeriaHref(SIN_FILTROS)).toBe("/galeria");
  });

  it("en inglés cuelga de /en y conserva los filtros", () => {
    expect(galeriaHref(SIN_FILTROS, {}, "en")).toBe("/en/galeria");
    expect(galeriaHref({ ...SIN_FILTROS, formato: "grande" }, {}, "en")).toBe(
      "/en/galeria?formato=grande",
    );
  });

  it("omite la página 1", () => {
    expect(galeriaHref({ ...SIN_FILTROS, pagina: 1 })).toBe("/galeria");
    expect(galeriaHref({ ...SIN_FILTROS, pagina: 2 })).toBe("/galeria?page=2");
  });

  // Al tocar un filtro se vuelve a la primera página: quedarse en la cuarta
  // de un catálogo que acaba de encogerse deja la pantalla vacía.
  it("conserva el resto de filtros al cambiar uno", () => {
    expect(
      galeriaHref(
        { ...SIN_FILTROS, formato: "grande", pagina: 4 },
        { serie: "marinas", pagina: 1 },
      ),
    ).toBe("/galeria?formato=grande&serie=marinas");
  });

  it("produce URLs que el propio parser entiende", () => {
    const filtros = {
      formato: "mediano" as const,
      serie: "marinas-de-invierno",
      soloDisponibles: true,
      pagina: 3,
    };
    const url = new URL(galeriaHref(filtros), "http://localhost");

    expect(parseFiltrosGaleria(Object.fromEntries(url.searchParams))).toEqual(
      filtros,
    );
  });
});
