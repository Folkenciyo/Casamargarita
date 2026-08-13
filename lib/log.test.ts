import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

let salida: string[];
let errores: string[];

beforeEach(() => {
  salida = [];
  errores = [];
  vi.spyOn(process.stdout, "write").mockImplementation((linea) => {
    salida.push(String(linea));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((linea) => {
    errores.push(String(linea));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ultima = (lineas: string[]) => JSON.parse(lineas.at(-1) ?? "{}");

describe("log", () => {
  it("escribe una línea JSON con nivel, mensaje y momento", () => {
    log.info("obra publicada", { slug: "marina-al-alba" });

    const registro = ultima(salida);
    expect(registro.nivel).toBe("info");
    expect(registro.mensaje).toBe("obra publicada");
    expect(registro.slug).toBe("marina-al-alba");
    expect(Date.parse(registro.momento)).not.toBeNaN();
  });

  it("cada suceso ocupa exactamente una línea", () => {
    log.info("con salto\nen el mensaje");

    expect(salida.at(-1)?.match(/\n/g)).toHaveLength(1);
  });

  // Un recolector de registros distingue lo que va a stderr; y en Docker eso
  // es lo que separa un aviso de un fallo.
  it("los fallos van por la salida de error", () => {
    log.error("no se pudo enviar el correo", new Error("smtp caído"));

    expect(salida).toHaveLength(0);
    expect(ultima(errores).nivel).toBe("error");
  });

  it("serializa el error con nombre y mensaje", () => {
    log.error("falló", new TypeError("esto no era un número"));

    const registro = ultima(errores);
    expect(registro.error.nombre).toBe("TypeError");
    expect(registro.error.mensaje).toBe("esto no era un número");
  });

  it("aguanta que le lancen algo que no es un Error", () => {
    log.error("falló", "una cadena suelta");

    expect(ultima(errores).error.mensaje).toBe("una cadena suelta");
  });

  it("oculta cualquier campo que huela a secreto", () => {
    log.info("intento de acceso", {
      email: "artista@example.com",
      password: "correcta-caballo-batería-grapa",
      ADMIN_PASSWORD_HASH: "$argon2id$v=19$...",
      sessionToken: "ey...",
    });

    const registro = ultima(salida);
    expect(registro.email).toBe("artista@example.com");
    expect(registro.password).toBe("[oculto]");
    expect(registro.ADMIN_PASSWORD_HASH).toBe("[oculto]");
    expect(registro.sessionToken).toBe("[oculto]");
  });

  it("los oculta también dentro de objetos anidados", () => {
    log.info("petición", { cabeceras: { cookie: "art_session=ey..." } });

    expect(ultima(salida).cabeceras.cookie).toBe("[oculto]");
  });

  it("no se pierde en una estructura que se apunta a sí misma", () => {
    const nido: Record<string, unknown> = {};
    nido.dentro = nido;

    expect(() => log.info("estructura circular", nido)).not.toThrow();
  });
});
