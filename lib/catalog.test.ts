import { describe, expect, it } from "vitest";
import {
  PRICE_ON_REQUEST,
  enlaceAObra,
  formatDimensions,
  formatPrice,
  toSlug,
  uniqueSlug,
  visiblePaintingFilter,
} from "./catalog";

describe("enlaceAObra", () => {
  const obra = {
    slug: "marina-de-invierno",
    title: "Marina de invierno",
    published: true,
    deletedAt: null,
  };

  it("devuelve slug y título de una obra publicada", () => {
    expect(enlaceAObra(obra)).toEqual({
      slug: "marina-de-invierno",
      title: "Marina de invierno",
    });
  });

  it("no enlaza una obra despublicada", () => {
    expect(enlaceAObra({ ...obra, published: false })).toBeNull();
  });

  // El caso que separaba al listado del diario de la entrada suelta.
  it("no enlaza una obra que está en la papelera", () => {
    expect(enlaceAObra({ ...obra, deletedAt: new Date() })).toBeNull();
  });

  it("aguanta una entrada que no habla de ninguna obra", () => {
    expect(enlaceAObra(null)).toBeNull();
    expect(enlaceAObra(undefined)).toBeNull();
  });
});

describe("formatPrice sin precio", () => {
  it("por defecto responde en español", () => {
    expect(formatPrice(null)).toBe(PRICE_ON_REQUEST);
  });

  it("admite el texto traducido para la versión en inglés", () => {
    expect(formatPrice(null, "EUR", "en-GB", "Price on request")).toBe(
      "Price on request",
    );
  });
});

describe("visiblePaintingFilter", () => {
  it("con las vendidas visibles exige publicada y fuera de la papelera", () => {
    expect(visiblePaintingFilter(true)).toEqual({
      published: true,
      deletedAt: null,
    });
  });

  it("con las vendidas ocultas descarta además el estado SOLD", () => {
    expect(visiblePaintingFilter(false)).toEqual({
      published: true,
      deletedAt: null,
      status: { not: "SOLD" },
    });
  });

  // La obra tirada a la papelera no se ve en la web pase lo que pase con el
  // resto de ajustes.
  it("nunca enseña obra en la papelera", () => {
    expect(visiblePaintingFilter(true).deletedAt).toBeNull();
    expect(visiblePaintingFilter(false).deletedAt).toBeNull();
  });

  // "No está a la venta" es obra de portfolio (colección privada, encargo
  // entregado): el interruptor dice «vendidas» y solo esconde las vendidas.
  it("nunca esconde la obra marcada como no venal", () => {
    const filter = visiblePaintingFilter(false);
    expect(JSON.stringify(filter)).not.toContain("NOT_FOR_SALE");
  });
});

describe("formatPrice", () => {
  it("formatea euros sin decimales cuando la cifra es redonda", () => {
    expect(formatPrice(1500000)).toMatch(/^15\.000\s€$/);
  });

  it("no agrupa los millares de cuatro dígitos (convención es-ES)", () => {
    expect(formatPrice(120000)).toMatch(/^1200\s€$/);
  });

  it("muestra decimales solo si los hay", () => {
    expect(formatPrice(120050)).toMatch(/^1200,50\s€$/);
  });

  it("devuelve 'precio a consultar' con null", () => {
    expect(formatPrice(null)).toBe(PRICE_ON_REQUEST);
    expect(formatPrice(undefined)).toBe(PRICE_ON_REQUEST);
  });

  it("rechaza precios negativos", () => {
    expect(() => formatPrice(-1)).toThrow(RangeError);
  });
});

describe("formatDimensions", () => {
  it("usa ancho × alto en cm", () => {
    expect(formatDimensions(100, 81)).toBe("100 × 81 cm");
  });

  it("rechaza medidas no enteras o no positivas", () => {
    expect(() => formatDimensions(10.5, 20)).toThrow(TypeError);
    expect(() => formatDimensions(0, 20)).toThrow(RangeError);
  });
});

describe("toSlug", () => {
  it("normaliza acentos y espacios", () => {
    expect(toSlug("Luz de tarde")).toBe("luz-de-tarde");
    expect(toSlug("Retrato en ocres nº 2")).toBe("retrato-en-ocres-no-2");
  });

  it("falla si el título no deja caracteres útiles", () => {
    expect(() => toSlug("!!!")).toThrow(RangeError);
  });
});

describe("uniqueSlug", () => {
  it("añade sufijo hasta encontrar hueco", async () => {
    const existing = new Set(["luz-de-tarde", "luz-de-tarde-2"]);
    await expect(
      uniqueSlug("Luz de tarde", async (s) => existing.has(s)),
    ).resolves.toBe("luz-de-tarde-3");
  });

  it("devuelve el slug base si está libre", async () => {
    await expect(uniqueSlug("Luz de tarde", async () => false)).resolves.toBe(
      "luz-de-tarde",
    );
  });
});
