import { describe, expect, it } from "vitest";
import { EYE_LEVEL, hangPaintings, type RoomPainting } from "./room-layout";

function painting(widthCm: number, heightCm: number): RoomPainting {
  return {
    slug: `obra-${widthCm}`,
    title: "Obra",
    priceLabel: "1200 €",
    widthCm,
    heightCm,
    textureUrl: "/api/uploads/x/800.webp",
  };
}

describe("hangPaintings", () => {
  it("convierte centímetros a metros a escala real", () => {
    const { hung } = hangPaintings([painting(100, 81)]);
    expect(hung[0]!.width).toBeCloseTo(1);
    expect(hung[0]!.height).toBeCloseTo(0.81);
  });

  it("cuelga todo a la altura de los ojos", () => {
    const { hung } = hangPaintings([painting(100, 81), painting(50, 70)]);
    expect(hung.every((p) => p.y === EYE_LEVEL)).toBe(true);
  });

  it("centra la fila en el origen", () => {
    const { hung } = hangPaintings([painting(100, 100), painting(100, 100)]);
    const centre = (hung[0]!.x + hung[1]!.x) / 2;
    expect(centre).toBeCloseTo(0);
  });

  it("no solapa obras contiguas", () => {
    const { hung } = hangPaintings([painting(120, 90), painting(80, 60)]);
    const rightEdge = hung[0]!.x + hung[0]!.width / 2;
    const leftEdge = hung[1]!.x - hung[1]!.width / 2;
    expect(leftEdge).toBeGreaterThan(rightEdge);
  });

  it("da un ancho de pared mínimo aunque haya una sola obra pequeña", () => {
    const { wallWidth } = hangPaintings([painting(30, 30)]);
    expect(wallWidth).toBeGreaterThanOrEqual(8);
  });

  it("acepta una sala vacía", () => {
    const { hung, wallWidth } = hangPaintings([]);
    expect(hung).toEqual([]);
    expect(wallWidth).toBeGreaterThan(0);
  });
});
