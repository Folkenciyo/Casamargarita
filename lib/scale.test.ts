import { describe, expect, it } from "vitest";
import {
  ALTURA_OJOS_CM,
  PERSONA,
  REFERENCIAS,
  bordeInferiorCm,
  proporciones,
  referenciaPorId,
} from "./scale";

const persona = PERSONA;

describe("referenciaPorId", () => {
  it("devuelve la referencia pedida", () => {
    expect(referenciaPorId("sofa").nombre).toBe("Un sofá");
  });

  it("ante un identificador desconocido devuelve la persona", () => {
    expect(referenciaPorId("elefante")).toBe(PERSONA);
  });
});

describe("bordeInferiorCm", () => {
  it("cuelga la obra centrada a la altura de los ojos", () => {
    expect(bordeInferiorCm(80)).toBe(ALTURA_OJOS_CM - 40);
  });

  // Un cuadro de tres metros no puede tener el borde bajo el suelo.
  it("apoya en el suelo la obra más alta que la altura de colgado", () => {
    expect(bordeInferiorCm(400)).toBe(0);
  });
});

describe("proporciones", () => {
  it("rechaza medidas que no son positivas", () => {
    expect(() =>
      proporciones({ obraAnchoCm: 0, obraAltoCm: 50, referencia: persona }),
    ).toThrow(RangeError);
  });

  /**
   * Lo único que este cálculo tiene que garantizar: que la relación entre la
   * obra y su referencia en pantalla sea la misma que en centímetros. Si esto
   * se rompe, el dibujo miente.
   */
  it("mantiene la proporción real entre la obra y la referencia", () => {
    const medidas = proporciones({
      obraAnchoCm: 100,
      obraAltoCm: 81,
      referencia: persona,
    });

    expect(medidas.obraAltoPct / medidas.referenciaAltoPct).toBeCloseTo(
      81 / persona.altoCm,
      5,
    );
  });

  it("mantiene también la proporción entre el ancho y el alto de la obra", () => {
    const medidas = proporciones({
      obraAnchoCm: 100,
      obraAltoCm: 81,
      referencia: persona,
    });

    expect(medidas.obraAnchoPct / medidas.obraAltoPct).toBeCloseTo(100 / 81, 5);
  });

  // El escenario tiene que dar cabida a lo más alto de los dos, y una obra
  // colgada a 150 cm de centro sube por encima de una persona en cuanto mide
  // más de 40 cm de alto.
  it("el escenario llega al borde superior de la obra cuando esta sobresale", () => {
    const medidas = proporciones({
      obraAnchoCm: 100,
      obraAltoCm: 120,
      referencia: persona,
    });

    expect(medidas.masAltoCm).toBe(ALTURA_OJOS_CM + 60);
    expect(medidas.obraAltoPct).toBeLessThanOrEqual(100);
    expect(medidas.referenciaAltoPct).toBeLessThanOrEqual(100);
  });

  it("con una obra pequeña manda la altura de la referencia", () => {
    const medidas = proporciones({
      obraAnchoCm: 20,
      obraAltoCm: 20,
      referencia: persona,
    });

    expect(medidas.masAltoCm).toBe(persona.altoCm);
    expect(medidas.referenciaAltoPct).toBe(100);
  });

  it("nada se sale del escenario, sea cual sea la referencia", () => {
    for (const referencia of REFERENCIAS) {
      const medidas = proporciones({
        obraAnchoCm: 250,
        obraAltoCm: 300,
        referencia,
      });
      expect(medidas.obraAltoPct).toBeLessThanOrEqual(100);
      expect(medidas.referenciaAltoPct).toBeLessThanOrEqual(100);
    }
  });
});
