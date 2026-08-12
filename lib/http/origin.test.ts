import { describe, expect, it } from "vitest";
import { clientIp, isSameOrigin } from "./origin";

function req(headers: Record<string, string>): Request {
  return new Request("http://galeria.test/api/admin/paintings", {
    method: "POST",
    headers,
  });
}

describe("isSameOrigin", () => {
  it("acepta Origin del propio host", () => {
    expect(
      isSameOrigin(
        req({ host: "galeria.test", origin: "http://galeria.test" }),
      ),
    ).toBe(true);
  });

  it("acepta Referer cuando no hay Origin", () => {
    expect(
      isSameOrigin(
        req({ host: "galeria.test", referer: "http://galeria.test/admin" }),
      ),
    ).toBe(true);
  });

  it("rechaza otro host", () => {
    expect(
      isSameOrigin(req({ host: "galeria.test", origin: "http://malo.test" })),
    ).toBe(false);
  });

  it("rechaza peticiones sin Origin ni Referer", () => {
    expect(isSameOrigin(req({ host: "galeria.test" }))).toBe(false);
  });

  it("rechaza un Origin que no es una URL", () => {
    expect(
      isSameOrigin(req({ host: "galeria.test", origin: "null" })),
    ).toBe(false);
  });
});

describe("clientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(
      clientIp(req({ host: "g.test", "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    ).toBe("1.2.3.4");
  });

  it("devuelve un valor estable si falta la cabecera", () => {
    expect(clientIp(req({ host: "g.test" }))).toBe("desconocida");
  });
});
