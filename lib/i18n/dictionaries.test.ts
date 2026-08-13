import { describe, expect, it } from "vitest";
import {
  IDIOMAS,
  IDIOMA_POR_DEFECTO,
  diccionario,
  esIdioma,
  prefijo,
  ruta,
} from "./dictionaries";

describe("esIdioma", () => {
  it("acepta los idiomas conocidos", () => {
    expect(esIdioma("es")).toBe(true);
    expect(esIdioma("en")).toBe(true);
  });

  it("rechaza cualquier otro segmento de la URL", () => {
    expect(esIdioma("fr")).toBe(false);
    expect(esIdioma("galeria")).toBe(false);
    expect(esIdioma(undefined)).toBe(false);
  });
});

describe("prefijo y ruta", () => {
  // Lo que no puede cambiar: las direcciones en español son las de siempre.
  // Si esto se rompiera, se caerían todos los enlaces ya indexados.
  it("el español no lleva prefijo", () => {
    expect(prefijo("es")).toBe("");
    expect(ruta("es", "/galeria")).toBe("/galeria");
  });

  it("el inglés cuelga de /en", () => {
    expect(prefijo("en")).toBe("/en");
    expect(ruta("en", "/galeria")).toBe("/en/galeria");
  });

  it("acepta rutas con y sin barra inicial", () => {
    expect(ruta("en", "galeria")).toBe("/en/galeria");
    expect(ruta("es", "galeria")).toBe("/galeria");
  });

  it("la portada en español es la raíz, no la cadena vacía", () => {
    expect(ruta("es", "/")).toBe("/");
    expect(ruta("en", "/")).toBe("/en/");
  });
});

describe("diccionarios", () => {
  /**
   * Un hueco en una traducción no da error de tipos si alguien usa `as`, y
   * en pantalla aparece como una cadena vacía. Se comprueba que todas las
   * claves tengan contenido en todos los idiomas.
   */
  function claves(objeto: object, prefijoClave = ""): string[] {
    return Object.entries(objeto).flatMap(([clave, valor]) => {
      const ruta = prefijoClave ? `${prefijoClave}.${clave}` : clave;
      if (typeof valor === "object" && valor !== null) {
        return claves(valor as object, ruta);
      }
      return [ruta];
    });
  }

  it("todos los idiomas tienen exactamente las mismas claves", () => {
    const referencia = claves(diccionario(IDIOMA_POR_DEFECTO)).sort();
    for (const idioma of IDIOMAS) {
      expect(claves(diccionario(idioma)).sort(), idioma).toEqual(referencia);
    }
  });

  it("ningún texto está vacío", () => {
    for (const idioma of IDIOMAS) {
      const dic = diccionario(idioma) as unknown as Record<string, unknown>;
      const vacios: string[] = [];

      const recorrer = (objeto: Record<string, unknown>, camino = "") => {
        for (const [clave, valor] of Object.entries(objeto)) {
          const ruta = camino ? `${camino}.${clave}` : clave;
          if (typeof valor === "string" && valor.trim() === "") vacios.push(ruta);
          else if (typeof valor === "object" && valor !== null) {
            recorrer(valor as Record<string, unknown>, ruta);
          }
        }
      };

      recorrer(dic);
      expect(vacios, idioma).toEqual([]);
    }
  });

  it("las traducciones no son iguales al español", () => {
    // Un descuido típico: copiar el bloque y olvidarse de traducirlo.
    expect(diccionario("en").nav.galeria).not.toBe(diccionario("es").nav.galeria);
    expect(diccionario("en").estados.SOLD).not.toBe(
      diccionario("es").estados.SOLD,
    );
  });

  it("el atributo lang del html coincide con el idioma", () => {
    for (const idioma of IDIOMAS) {
      expect(diccionario(idioma).htmlLang).toBe(idioma);
    }
  });
});
