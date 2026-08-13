import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Las constantes se evalúan al importar el módulo, así que cada caso necesita
 * su propia importación con el entorno ya preparado.
 */
async function loadSite(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("./site");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("identidad del sitio", () => {
  it("usa las variables de entorno cuando están puestas", async () => {
    const site = await loadSite({
      PUBLIC_SITE_NAME: "Casa Margarita",
      PUBLIC_URL: "https://casamargarita.example",
      PUBLIC_SITE_DESCRIPTION: "Óleo contemporáneo",
    });

    expect(site.SITE_NAME).toBe("Casa Margarita");
    expect(site.SITE_URL).toBe("https://casamargarita.example");
    expect(site.SITE_DESCRIPTION).toBe("Óleo contemporáneo");
  });

  it("cae en valores por defecto si no hay nada configurado", async () => {
    const site = await loadSite({
      PUBLIC_SITE_NAME: undefined,
      PUBLIC_URL: undefined,
      PUBLIC_SITE_DESCRIPTION: undefined,
    });

    expect(site.SITE_NAME).toBe("Casa Margarita");
    expect(site.SITE_URL).toBe("http://localhost:3000");
    expect(site.SITE_DESCRIPTION).toContain("óleo");
  });

  // Una variable declarada pero vacía en .env.app es el caso más probable de
  // todos, y no puede dejar el título en blanco ni metadataBase sin URL.
  it("trata una variable con solo espacios como si no estuviera", async () => {
    const site = await loadSite({
      PUBLIC_SITE_NAME: "   ",
      PUBLIC_URL: "  ",
    });

    expect(site.SITE_NAME).toBe("Casa Margarita");
    expect(site.SITE_URL).toBe("http://localhost:3000");
  });

  it("quita los espacios sobrantes alrededor del nombre", async () => {
    const site = await loadSite({ PUBLIC_SITE_NAME: "  Casa Margarita  " });

    expect(site.SITE_NAME).toBe("Casa Margarita");
  });
});
