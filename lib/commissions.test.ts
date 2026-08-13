import { describe, expect, it } from "vitest";
import { commissionSchema, horquillaEncargo } from "./commissions";

describe("horquillaEncargo", () => {
  it("da horquilla para los tamaños de la tabla", () => {
    expect(horquillaEncargo(30, 20)).toEqual({
      desdeCentimos: 25000,
      hastaCentimos: 45000,
    });
    expect(horquillaEncargo(100, 80)).toEqual({
      desdeCentimos: 90000,
      hastaCentimos: 180000,
    });
  });

  it("clasifica por el lado mayor", () => {
    expect(horquillaEncargo(20, 65)).toEqual(horquillaEncargo(65, 20));
  });

  // Por encima de cierto tamaño el precio depende del encargo concreto: dar
  // una cifra sería inventarla.
  it("no inventa precio fuera de la tabla", () => {
    expect(horquillaEncargo(200, 150)).toBeNull();
  });

  it("aguanta medidas absurdas sin romperse", () => {
    expect(horquillaEncargo(0, 50)).toBeNull();
    expect(horquillaEncargo(-10, -10)).toBeNull();
  });

  it("la horquilla siempre va de menos a más", () => {
    for (const [ancho, alto] of [
      [30, 20],
      [60, 50],
      [100, 90],
    ] as const) {
      const horquilla = horquillaEncargo(ancho, alto);
      expect(horquilla).not.toBeNull();
      if (horquilla) {
        expect(horquilla.hastaCentimos).toBeGreaterThan(horquilla.desdeCentimos);
      }
    }
  });

  it("a mayor tamaño, nunca menos precio", () => {
    const pequena = horquillaEncargo(30, 20)!;
    const mediana = horquillaEncargo(60, 50)!;
    const grande = horquillaEncargo(100, 90)!;

    expect(mediana.desdeCentimos).toBeGreaterThanOrEqual(pequena.desdeCentimos);
    expect(grande.desdeCentimos).toBeGreaterThanOrEqual(mediana.desdeCentimos);
  });
});

describe("commissionSchema", () => {
  const valido = {
    name: "Ana",
    email: "ana@example.com",
    brief: "Me gustaría un paisaje de la costa donde veraneaba de pequeña.",
  };

  it("acepta un encargo bien descrito", () => {
    expect(commissionSchema.parse(valido).name).toBe("Ana");
  });

  // Un encargo de tres palabras no se puede presupuestar; pedir detalle en el
  // formulario ahorra el intercambio de correos que vendría después.
  it("exige que se explique lo que se quiere", () => {
    expect(() =>
      commissionSchema.parse({ ...valido, brief: "un cuadro" }),
    ).toThrow();
  });

  it("las medidas son opcionales y llegan como número o null", () => {
    expect(commissionSchema.parse(valido).widthCm).toBeNull();
    expect(
      commissionSchema.parse({ ...valido, widthCm: "80" }).widthCm,
    ).toBe(80);
  });

  it("rechaza el envío si el honeypot viene relleno", () => {
    expect(() =>
      commissionSchema.parse({ ...valido, website: "http://spam.test" }),
    ).toThrow();
  });
});
