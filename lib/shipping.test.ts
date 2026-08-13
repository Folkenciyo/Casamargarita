import { describe, expect, it } from "vitest";
import { ZONAS, esZona, presupuestoEnvio } from "./shipping";

const peninsula = (anchoCm: number, altoCm: number) =>
  presupuestoEnvio({ anchoCm, altoCm, zona: "peninsula" });

describe("presupuestoEnvio", () => {
  it("rechaza medidas que no son positivas", () => {
    expect(() => peninsula(0, 50)).toThrow(RangeError);
    expect(() => peninsula(50, -1)).toThrow(RangeError);
  });

  it("cobra por el lado mayor, no por la superficie", () => {
    const alargada = peninsula(20, 120);
    const cuadrada = peninsula(120, 120);

    expect(alargada).toEqual(cuadrada);
  });

  /**
   * El embalaje añade unos centímetros: una obra de 95 cm no entra en la caja
   * del escalón de 100. Si esto se rompiera, la web daría un precio por
   * debajo del real justo en el límite.
   */
  it("cuenta el embalaje al elegir escalón", () => {
    // 40 + 10 = 50, justo en el límite del escalón pequeño.
    expect(peninsula(40, 30)).toMatchObject({ escalon: "pequeño" });
    // 45 + 10 = 55: se pasa, aunque la obra midiera menos de 50.
    expect(peninsula(45, 30)).toMatchObject({ escalon: "mediano" });
    expect(peninsula(95, 60)).toMatchObject({ escalon: "grande" });
  });

  it("lo que no cabe en mensajería se manda a consultar", () => {
    const grande = peninsula(200, 150);
    expect(grande.tipo).toBe("a-consultar");
    if (grande.tipo === "a-consultar") {
      expect(grande.motivo).toContain("transporte especial");
    }
  });

  it("el precio sube con la distancia", () => {
    const cerca = presupuestoEnvio({ anchoCm: 40, altoCm: 30, zona: "peninsula" });
    const lejos = presupuestoEnvio({ anchoCm: 40, altoCm: 30, zona: "resto" });

    if (cerca.tipo === "tarifa" && lejos.tipo === "tarifa") {
      expect(lejos.centimos).toBeGreaterThan(cerca.centimos);
    } else {
      throw new Error("ambas deberían tener tarifa");
    }
  });

  it("hay tarifa para todas las zonas y todos los escalones", () => {
    for (const zona of ZONAS) {
      for (const [ancho, alto] of [
        [30, 20],
        [70, 50],
        [120, 90],
      ] as const) {
        const presupuesto = presupuestoEnvio({
          anchoCm: ancho,
          altoCm: alto,
          zona,
        });
        expect(presupuesto.tipo, `${zona} ${ancho}x${alto}`).toBe("tarifa");
        if (presupuesto.tipo === "tarifa") {
          expect(presupuesto.centimos).toBeGreaterThan(0);
        }
      }
    }
  });

  it("dentro de una zona, más grande nunca cuesta menos", () => {
    for (const zona of ZONAS) {
      const precios = [
        [30, 20],
        [70, 50],
        [120, 90],
      ].map((medidas) => {
        const p = presupuestoEnvio({
          anchoCm: medidas[0]!,
          altoCm: medidas[1]!,
          zona,
        });
        return p.tipo === "tarifa" ? p.centimos : Number.MAX_SAFE_INTEGER;
      });

      expect([...precios].sort((a, b) => a - b), zona).toEqual(precios);
    }
  });
});

describe("esZona", () => {
  it("acepta las zonas conocidas y rechaza el resto", () => {
    expect(esZona("peninsula")).toBe(true);
    expect(esZona("marte")).toBe(false);
    expect(esZona(undefined)).toBe(false);
  });
});
