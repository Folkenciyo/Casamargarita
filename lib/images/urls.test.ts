import { describe, expect, it } from "vitest";
import {
  IMAGE_WIDTHS,
  ZOOM_WIDTH,
  imageUrl,
  isServableVariant,
  largestWidth,
  responsiveWidths,
  srcSet,
} from "./urls";

describe("imageUrl", () => {
  it("compone la ruta de una variante", () => {
    expect(imageUrl("paintings/p1/i1", 800, "webp")).toBe(
      "/api/uploads/paintings/p1/i1/800.webp",
    );
  });
});

describe("responsiveWidths", () => {
  /**
   * El ancho de zoom pesa varios megas. Si entrara en el srcset, cualquier
   * pantalla grande lo descargaría solo por visitar la ficha, sin que nadie
   * haya pedido ver el detalle.
   */
  it("deja fuera el ancho de zoom", () => {
    expect(responsiveWidths([400, 800, 1600, 3200])).toEqual([400, 800, 1600]);
  });

  it("no toca las imágenes que no llegan a ese ancho", () => {
    expect(responsiveWidths([400, 800])).toEqual([400, 800]);
  });

  it("no aparece en ningún srcset", () => {
    const conjunto = srcSet(
      "paintings/p1/i1",
      responsiveWidths([...IMAGE_WIDTHS]),
      "avif",
    );
    expect(conjunto).not.toContain(String(ZOOM_WIDTH));
  });
});

describe("largestWidth", () => {
  it("elige el ancho mayor disponible", () => {
    expect(largestWidth([400, 800, 1600, 3200])).toBe(3200);
  });

  // Las fotos subidas antes de que existiera el ancho de zoom no lo tienen:
  // el visor amplía sobre la mayor que haya en lugar de pedir un 404.
  it("con una imagen antigua se queda en la mayor que exista", () => {
    expect(largestWidth([400, 800, 1600])).toBe(1600);
  });

  it("aguanta una lista vacía", () => {
    expect(largestWidth([])).toBe(400);
  });
});

describe("isServableVariant", () => {
  it("sirve el ancho de zoom, que ahora es una variante legítima", () => {
    expect(isServableVariant("3200.webp")).toBe(true);
    expect(isServableVariant("3200.avif")).toBe(true);
  });

  it("sigue sin servir el original ni anchos inventados", () => {
    expect(isServableVariant("orig.jpg")).toBe(false);
    expect(isServableVariant("2400.webp")).toBe(false);
  });
});
