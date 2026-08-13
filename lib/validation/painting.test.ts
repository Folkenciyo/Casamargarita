import { describe, expect, it } from "vitest";
import { artistSchema, inquirySchema, paintingSchema } from "./painting";

const base = {
  title: "Luz de tarde",
  widthCm: "100",
  heightCm: "81",
  priceCents: "1200",
  status: "AVAILABLE",
};

describe("paintingSchema", () => {
  it("convierte euros escritos a mano en céntimos", () => {
    expect(paintingSchema.parse(base).priceCents).toBe(120000);
    expect(
      paintingSchema.parse({ ...base, priceCents: "1.200,50" }).priceCents,
    ).toBe(120050);
  });

  it("acepta precio vacío como 'a consultar'", () => {
    expect(paintingSchema.parse({ ...base, priceCents: "" }).priceCents).toBe(
      null,
    );
  });

  it("rechaza precios no numéricos", () => {
    expect(() =>
      paintingSchema.parse({ ...base, priceCents: "gratis" }),
    ).toThrow();
  });

  it("exige título y medidas positivas", () => {
    expect(() => paintingSchema.parse({ ...base, title: "  " })).toThrow();
    expect(() => paintingSchema.parse({ ...base, widthCm: "0" })).toThrow();
    expect(() => paintingSchema.parse({ ...base, heightCm: "-5" })).toThrow();
  });

  it("aplica la técnica por defecto", () => {
    expect(paintingSchema.parse(base).technique).toBe("Óleo sobre lienzo");
  });

  it("normaliza el año vacío a null", () => {
    expect(paintingSchema.parse({ ...base, year: "" }).year).toBe(null);
    expect(paintingSchema.parse({ ...base, year: "2024" }).year).toBe(2024);
  });

  it("rechaza estados desconocidos", () => {
    expect(() => paintingSchema.parse({ ...base, status: "REGALADO" })).toThrow();
  });
});

describe("inquirySchema", () => {
  const valid = {
    name: "Ana",
    email: "ana@example.com",
    message: "Me interesa esta obra, ¿sigue disponible?",
  };

  it("acepta una consulta correcta", () => {
    expect(inquirySchema.parse(valid).email).toBe("ana@example.com");
  });

  it("rechaza el envío si el honeypot viene relleno", () => {
    expect(() =>
      inquirySchema.parse({ ...valid, website: "http://spam.test" }),
    ).toThrow();
  });

  it("exige un mensaje con contenido", () => {
    expect(() => inquirySchema.parse({ ...valid, message: "hola" })).toThrow();
  });
});

describe("artistSchema", () => {
  const valid = { name: "Casa Margarita" };

  it("exige el nombre", () => {
    expect(() => artistSchema.parse({ ...valid, name: "  " })).toThrow();
  });

  // Actualizar la app no puede vaciar la galería de obra vendida: si el
  // campo no llega, se muestra.
  it("muestra las vendidas si el formulario no dice nada", () => {
    expect(artistSchema.parse(valid).showSoldPaintings).toBe(true);
  });

  it("respeta el interruptor cuando llega", () => {
    expect(
      artistSchema.parse({ ...valid, showSoldPaintings: false })
        .showSoldPaintings,
    ).toBe(false);
  });

  it("rechaza un correo mal escrito pero acepta que esté vacío", () => {
    expect(artistSchema.parse({ ...valid, email: "" }).email).toBe("");
    expect(() => artistSchema.parse({ ...valid, email: "arroba" })).toThrow();
  });
});
