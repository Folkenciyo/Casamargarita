import { describe, expect, it } from "vitest";
import {
  FADE_S,
  LIFE_S,
  SLOTS,
  TEXTURES,
  fieldAt,
  lifeOpacity,
  random01,
  windAt,
} from "./daisy-field";

describe("random01", () => {
  it("se queda dentro de [0,1)", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const value = random01(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("devuelve siempre lo mismo para la misma semilla", () => {
    expect(random01(42)).toBe(random01(42));
  });

  it("reparte, no se apelotona en un extremo", () => {
    const values = Array.from({ length: 200 }, (_, i) => random01(i));
    const media = values.reduce((a, b) => a + b, 0) / values.length;
    expect(media).toBeGreaterThan(0.35);
    expect(media).toBeLessThan(0.65);
  });
});

describe("lifeOpacity", () => {
  it("nace y muere invisible", () => {
    expect(lifeOpacity(0)).toBe(0);
    expect(lifeOpacity(LIFE_S)).toBe(0);
  });

  it("se ve entera en mitad de su vida", () => {
    expect(lifeOpacity(LIFE_S / 2)).toBe(1);
  });

  it("entra y sale de forma gradual", () => {
    expect(lifeOpacity(FADE_S / 2)).toBeCloseTo(0.5);
    expect(lifeOpacity(LIFE_S - FADE_S / 2)).toBeCloseTo(0.5);
  });

  it("no se sale de rango en ningún momento de la vida", () => {
    for (let age = -2; age <= LIFE_S + 2; age += 0.25) {
      const value = lifeOpacity(age);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("windAt", () => {
  it("mantiene la inclinación en un ángulo creíble", () => {
    for (let time = 0; time < 400; time += 0.5) {
      for (const x of [-6, -2, 0, 3, 7]) {
        expect(Math.abs(windAt(time, x))).toBeLessThan(0.2);
      }
    }
  });

  it("no mece todo el campo a la vez", () => {
    // Dos puntos separados no pueden llevar exactamente la misma inclinación:
    // si la llevaran, la ondulación no viajaría.
    expect(windAt(3, -4)).not.toBeCloseTo(windAt(3, 4), 3);
  });

  it("cambia con el tiempo", () => {
    expect(windAt(0, 0)).not.toBeCloseTo(windAt(2.5, 0), 3);
  });
});

describe("fieldAt", () => {
  it("mantiene el número de flores", () => {
    expect(fieldAt(0)).toHaveLength(SLOTS);
    expect(fieldAt(137.4)).toHaveLength(SLOTS);
  });

  it("es determinista", () => {
    expect(fieldAt(51.25)).toEqual(fieldAt(51.25));
  });

  it("solo apunta a texturas que existen", () => {
    for (let time = 0; time < 400; time += 1.3) {
      for (const daisy of fieldAt(time)) {
        expect(daisy.texture).toBeGreaterThanOrEqual(0);
        expect(daisy.texture).toBeLessThan(TEXTURES.length);
        expect(Number.isInteger(daisy.texture)).toBe(true);
      }
    }
  });

  it("nunca deja el fondo del todo vacío", () => {
    // Los ciclos van desfasados: siempre hay al menos una flor a media vida.
    for (let time = 0; time < 400; time += 0.7) {
      const visible = fieldAt(time).reduce((sum, d) => sum + d.opacity, 0);
      expect(visible).toBeGreaterThan(0.3);
    }
  });

  it("reparte las flores en profundidades distintas", () => {
    const depths = new Set(fieldAt(10).map((d) => d.z));
    expect(depths.size).toBe(SLOTS);
    for (const z of depths) expect(z).toBeLessThan(0);
  });

  it("las coloca dentro del encuadre y con un tamaño de fondo", () => {
    for (let time = 0; time < 400; time += 1.1) {
      for (const daisy of fieldAt(time)) {
        // Puede asomar por el borde, pero nunca queda fuera de la pantalla.
        expect(Math.abs(daisy.x)).toBeLessThan(1.05);
        expect(daisy.height).toBeGreaterThan(0.2);
        expect(daisy.height).toBeLessThan(0.75);
      }
    }
  });

  it("no amontona las tres flores en el mismo lado", () => {
    for (let time = 0; time < 400; time += 1.1) {
      const lados = new Set(fieldAt(time).map((d) => Math.sign(d.x)));
      expect(lados.size).toBeGreaterThan(1);
    }
  });

  it("cambia de sitio al renovarse el brote", () => {
    // Un ciclo entero después, el mismo hueco trae otra flor en otro sitio.
    const antes = fieldAt(1)[0]!;
    const despues = fieldAt(1 + LIFE_S)[0]!;
    expect(despues.x).not.toBeCloseTo(antes.x, 3);
  });

  it("no da un salto al cambiar de ciclo", () => {
    // Justo antes del relevo la flor ya se ha ido: si no, se vería cambiar de
    // sitio en un fotograma.
    const alBorde = fieldAt(LIFE_S - 0.05)[0]!;
    expect(alBorde.opacity).toBeLessThan(0.05);
  });
});
