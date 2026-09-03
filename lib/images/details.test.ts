import { describe, expect, it } from "vitest";
import {
  DETAIL_COUNT,
  DETAIL_MIN_SOURCE_PX,
  canGenerateDetails,
  detailCaption,
  detailCrops,
  randomDetailCrop,
} from "./details";

describe("canGenerateDetails", () => {
  it("acepta una foto con resolución de sobra", () => {
    expect(canGenerateDetails(4000, 3000)).toBe(true);
  });

  it("mide por el lado menor, no por el mayor", () => {
    // Un panorámico larguísimo pero bajo no da detalles decentes.
    expect(canGenerateDetails(9000, 900)).toBe(false);
  });

  it("marca el umbral justo donde dice la constante", () => {
    expect(canGenerateDetails(DETAIL_MIN_SOURCE_PX, DETAIL_MIN_SOURCE_PX)).toBe(true);
    expect(canGenerateDetails(DETAIL_MIN_SOURCE_PX - 1, 9000)).toBe(false);
  });
});

describe("detailCrops", () => {
  const casos: [number, number][] = [
    [4000, 3000],
    [3000, 4000],
    [2000, 2000],
    [6000, 2100],
    [2048, 2731],
  ];

  it("da tantos recortes como detalles anuncia", () => {
    expect(detailCrops(4000, 3000)).toHaveLength(DETAIL_COUNT);
  });

  it("no se sale de la imagen en ninguna proporción", () => {
    for (const [width, height] of casos) {
      for (const crop of detailCrops(width, height)) {
        expect(crop.left).toBeGreaterThanOrEqual(0);
        expect(crop.top).toBeGreaterThanOrEqual(0);
        expect(crop.left + crop.width).toBeLessThanOrEqual(width);
        expect(crop.top + crop.height).toBeLessThanOrEqual(height);
      }
    }
  });

  it("recorta en cuadrado", () => {
    for (const crop of detailCrops(4000, 3000)) {
      expect(crop.width).toBe(crop.height);
    }
  });

  it("saca un detalle aprovechable de un original en el umbral", () => {
    // 800 px es la primera variante decente del pipeline.
    const [primero] = detailCrops(DETAIL_MIN_SOURCE_PX, DETAIL_MIN_SOURCE_PX);
    expect(primero!.width).toBeGreaterThanOrEqual(800);
  });

  it("mira a tres sitios distintos del cuadro", () => {
    const posiciones = detailCrops(4000, 3000).map((c) => `${c.left}×${c.top}`);
    expect(new Set(posiciones).size).toBe(DETAIL_COUNT);
  });

  it("devuelve enteros: sharp no admite recortes a medio píxel", () => {
    for (const crop of detailCrops(3333, 2777)) {
      expect(Number.isInteger(crop.left)).toBe(true);
      expect(Number.isInteger(crop.top)).toBe(true);
      expect(Number.isInteger(crop.width)).toBe(true);
      expect(Number.isInteger(crop.height)).toBe(true);
    }
  });
});

describe("randomDetailCrop", () => {
  const casos: [number, number][] = [
    [4000, 3000],
    [3000, 4000],
    [2000, 2000],
    [6000, 2100],
  ];

  it("no se sale de la imagen en ninguna proporción", () => {
    for (const [width, height] of casos) {
      // Varios `rng` fijos, no solo los extremos: un desliz en el cálculo
      // de `maxLeft`/`maxTop` podría no notarse en 0 ni en 1.
      for (const valor of [0, 0.25, 0.5, 0.75, 0.999]) {
        const crop = randomDetailCrop(width, height, () => valor);
        expect(crop.left).toBeGreaterThanOrEqual(0);
        expect(crop.top).toBeGreaterThanOrEqual(0);
        expect(crop.left + crop.width).toBeLessThanOrEqual(width);
        expect(crop.top + crop.height).toBeLessThanOrEqual(height);
      }
    }
  });

  it("recorta en cuadrado, del mismo tamaño que detailCrops", () => {
    const [width, height] = [4000, 3000];
    const esperado = detailCrops(width, height)[0]!;
    const crop = randomDetailCrop(width, height, () => 0.5);
    expect(crop.width).toBe(crop.height);
    expect(crop.width).toBe(esperado.width);
  });

  it("es determinista para un mismo rng, y distinto para otro", () => {
    const a = randomDetailCrop(4000, 3000, () => 0.2);
    const b = randomDetailCrop(4000, 3000, () => 0.2);
    const c = randomDetailCrop(4000, 3000, () => 0.8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("en los extremos del rng toca los bordes de la imagen", () => {
    const [width, height] = [4000, 3000];
    const side = detailCrops(width, height)[0]!.width;

    const esquina = randomDetailCrop(width, height, () => 0);
    expect(esquina.left).toBe(0);
    expect(esquina.top).toBe(0);

    const opuesta = randomDetailCrop(width, height, () => 1);
    expect(opuesta.left).toBe(width - side);
    expect(opuesta.top).toBe(height - side);
  });
});

describe("detailCaption", () => {
  it("da un pie distinto a cada detalle", () => {
    const pies = Array.from({ length: DETAIL_COUNT }, (_, i) => detailCaption(i));
    expect(new Set(pies).size).toBe(DETAIL_COUNT);
  });

  it("nunca se queda sin pie", () => {
    expect(detailCaption(DETAIL_COUNT + 1)).toBeTruthy();
  });
});
