import { describe, expect, it } from "vitest";
import { agruparPorSeccion, SIN_SERIE_SLUG, type PaintingConSerie } from "./room-sections";

function obra(
  id: string,
  serie: { id: string; slug: string; title: string; published: boolean } | null,
): PaintingConSerie & { id: string } {
  return { id, series: serie };
}

const marinas = { id: "s1", slug: "marinas", title: "Marinas", published: true };
const interiores = { id: "s2", slug: "interiores", title: "Interiores", published: true };
const oculta = { id: "s3", slug: "oculta", title: "Oculta", published: false };

describe("agruparPorSeccion", () => {
  it("mete la obra sin serie en Sin serie", () => {
    const secciones = agruparPorSeccion([obra("a", null)], []);
    expect(secciones).toEqual([
      { id: SIN_SERIE_SLUG, slug: SIN_SERIE_SLUG, title: "Sin serie", paintings: [obra("a", null)] },
    ]);
  });

  it("no genera sección para una serie sin obra visible", () => {
    const secciones = agruparPorSeccion([obra("a", marinas)], [marinas, interiores]);
    expect(secciones.map((s) => s.slug)).toEqual(["marinas"]);
  });

  it("respeta el orden de las series recibidas", () => {
    const secciones = agruparPorSeccion(
      [obra("a", interiores), obra("b", marinas)],
      [marinas, interiores],
    );
    expect(secciones.map((s) => s.slug)).toEqual(["marinas", "interiores"]);
  });

  it("respeta el orden de llegada de las obras dentro de una sección", () => {
    const secciones = agruparPorSeccion(
      [obra("a", marinas), obra("b", marinas), obra("c", marinas)],
      [marinas],
    );
    expect(secciones[0]!.paintings.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("trata la obra de una serie no publicada como obra suelta", () => {
    const secciones = agruparPorSeccion([obra("a", oculta)], [marinas]);
    expect(secciones).toEqual([
      { id: SIN_SERIE_SLUG, slug: SIN_SERIE_SLUG, title: "Sin serie", paintings: [obra("a", oculta)] },
    ]);
  });

  it("pone Sin serie al final, después de las series con nombre", () => {
    const secciones = agruparPorSeccion(
      [obra("a", null), obra("b", marinas)],
      [marinas],
    );
    expect(secciones.map((s) => s.slug)).toEqual(["marinas", SIN_SERIE_SLUG]);
  });

  it("acepta que no haya ninguna obra", () => {
    expect(agruparPorSeccion([], [marinas])).toEqual([]);
  });
});
