import { describe, expect, it } from "vitest";
import { FORMATOS, esFormato, formatoDe, formatoWhere } from "./formats";

describe("formatoDe", () => {
  it.each([
    [40, 30, "pequeno"],
    [50, 50, "pequeno"],
    [51, 40, "mediano"],
    [100, 81, "mediano"],
    [101, 50, "grande"],
    [200, 150, "grande"],
  ])("%i × %i cm es %s", (ancho, alto, esperado) => {
    expect(formatoDe(ancho, alto)).toBe(esperado);
  });

  // Lo que decide dónde cabe un cuadro es su lado mayor, no su superficie.
  it("clasifica por el lado mayor, aunque el otro sea diminuto", () => {
    expect(formatoDe(30, 120)).toBe("grande");
    expect(formatoDe(120, 30)).toBe("grande");
  });
});

describe("formatoWhere", () => {
  /**
   * Los tres filtros tienen que repartirse el catálogo sin solaparse ni dejar
   * huecos. Se comprueba contra el clasificador, que es la única definición
   * verdadera de dónde va cada obra.
   */
  const medidas: [number, number][] = [
    [20, 20],
    [50, 50],
    [51, 20],
    [80, 100],
    [100, 100],
    [101, 30],
    [30, 120],
    [300, 200],
  ];

  const cumple = (
    where: ReturnType<typeof formatoWhere>,
    ancho: number,
    alto: number,
  ): boolean => {
    const condiciones: boolean[] = [];
    const w = where as Record<string, unknown>;

    if (w.widthCm) {
      const regla = w.widthCm as { lte?: number; gt?: number };
      if (regla.lte !== undefined) condiciones.push(ancho <= regla.lte);
      if (regla.gt !== undefined) condiciones.push(ancho > regla.gt);
    }
    if (w.heightCm) {
      const regla = w.heightCm as { lte?: number; gt?: number };
      if (regla.lte !== undefined) condiciones.push(alto <= regla.lte);
      if (regla.gt !== undefined) condiciones.push(alto > regla.gt);
    }
    if (Array.isArray(w.OR)) {
      const alguna = (w.OR as Record<string, { lte?: number; gt?: number }>[]).some(
        (rama) => {
          const [campo, regla] = Object.entries(rama)[0]!;
          const valor = campo === "widthCm" ? ancho : alto;
          if (regla.lte !== undefined) return valor <= regla.lte;
          if (regla.gt !== undefined) return valor > regla.gt;
          return false;
        },
      );
      condiciones.push(alguna);
    }

    return condiciones.every(Boolean);
  };

  it("cada obra cae exactamente en un formato", () => {
    for (const [ancho, alto] of medidas) {
      const coincidencias = FORMATOS.filter((formato) =>
        cumple(formatoWhere(formato), ancho, alto),
      );
      expect(coincidencias, `${ancho}×${alto}`).toHaveLength(1);
    }
  });

  it("el filtro coincide con lo que dice el clasificador", () => {
    for (const [ancho, alto] of medidas) {
      const formato = formatoDe(ancho, alto);
      expect(cumple(formatoWhere(formato), ancho, alto), `${ancho}×${alto}`).toBe(
        true,
      );
    }
  });
});

describe("esFormato", () => {
  it("acepta los tres formatos", () => {
    expect(esFormato("pequeno")).toBe(true);
    expect(esFormato("grande")).toBe(true);
  });

  it("rechaza cualquier otra cosa que llegue por la URL", () => {
    expect(esFormato("gigante")).toBe(false);
    expect(esFormato(undefined)).toBe(false);
  });
});
