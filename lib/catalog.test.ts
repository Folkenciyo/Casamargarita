import { describe, expect, it } from "vitest";
import {
  PRICE_ON_REQUEST,
  formatDimensions,
  formatPrice,
  toSlug,
  uniqueSlug,
} from "./catalog";

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
