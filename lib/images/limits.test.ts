import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  UPLOAD_BODY_LIMIT_BYTES,
  tooLargeMessage,
} from "./limits";

describe("UPLOAD_BODY_LIMIT_BYTES", () => {
  it("deja sitio para el sobre del multipart", () => {
    // Si el techo del cuerpo fuera igual o menor que el del fichero, una foto
    // de justo el máximo se caería con el 413 de Next —ilegible— en vez de con
    // el mensaje del pipeline.
    expect(UPLOAD_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_UPLOAD_BYTES);
  });

  it("no se pasa de generoso", () => {
    // El margen es para cabeceras y separadores, no para colar otra foto.
    expect(UPLOAD_BODY_LIMIT_BYTES).toBeLessThan(MAX_UPLOAD_BYTES * 1.1);
  });
});

describe("tooLargeMessage", () => {
  it("deja pasar lo que cabe", () => {
    expect(tooLargeMessage(0)).toBeNull();
    expect(tooLargeMessage(3 * 1024 * 1024)).toBeNull();
    expect(tooLargeMessage(MAX_UPLOAD_BYTES)).toBeNull();
  });

  it("avisa en cuanto se pasa", () => {
    expect(tooLargeMessage(MAX_UPLOAD_BYTES + 1)).not.toBeNull();
  });

  it("dice cuánto pesa y cuánto cabe", () => {
    const mensaje = tooLargeMessage(30 * 1024 * 1024);
    expect(mensaje).toContain("30,0 MB");
    expect(mensaje).toContain(`${MAX_UPLOAD_MB} MB`);
  });

  it("escribe los decimales como se escriben en castellano", () => {
    expect(tooLargeMessage(41.5 * 1024 * 1024)).toContain("41,5 MB");
  });
});
