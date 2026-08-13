import { expect, test } from "@playwright/test";
import { TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicSecurity } });

test("las cabeceras de seguridad llegan en la web pública", async ({ page }) => {
  const response = await page.goto("/galeria");
  const headers = response?.headers() ?? {};

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("cada visita trae su propio nonce", async ({ page }) => {
  const primera = await page.goto("/galeria");
  const segunda = await page.goto("/artista");

  const nonceDe = (csp: string | undefined) =>
    csp?.match(/'nonce-([^']+)'/)?.[1];

  const uno = nonceDe(primera?.headers()["content-security-policy"]);
  const dos = nonceDe(segunda?.headers()["content-security-policy"]);

  expect(uno).toBeTruthy();
  expect(dos).toBeTruthy();
  expect(uno).not.toBe(dos);
});

/**
 * La prueba de fuego de una CSP: recorrer la web con la consola abierta. Si
 * la política bloqueara un script de Next, de la capa de óleo o un bloque de
 * datos estructurados, el navegador lo diría aquí.
 */
test("ninguna página del sitio viola su propia política", async ({ page }) => {
  const violaciones: string[] = [];

  page.on("console", (mensaje) => {
    const texto = mensaje.text();
    // "Refused to" además del nombre de la política: es lo que dice el
    // navegador cuando bloquea algo de verdad. Sin ese matiz también entrarían
    // avisos informativos que no impiden nada.
    if (texto.includes("Refused to") && texto.includes("Content Security Policy")) {
      violaciones.push(texto);
    }
  });

  for (const ruta of ["/", "/galeria", "/artista", "/obra/amanecer-en-el-estudio"]) {
    await page.goto(ruta);
    await expect(page.locator("h1").first()).toBeVisible();
  }

  expect(violaciones).toEqual([]);
});

/**
 * Se mira el HTML servido y no el DOM: el navegador vacía a propósito el
 * atributo `nonce` una vez lo ha leído, para que no se pueda extraer con un
 * selector de CSS. En el DOM siempre aparecería como `nonce=""` aunque todo
 * funcione.
 */
test("los datos estructurados van firmados con el nonce de su propia política", async ({
  request,
}) => {
  const response = await request.get("/obra/amanecer-en-el-estudio");
  const html = await response.text();

  const nonceDePolitica = response
    .headers()
    ["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
  expect(nonceDePolitica).toBeTruthy();

  const bloque = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s,
  );
  expect(bloque, "no hay bloque de datos estructurados en la ficha").toBeTruthy();

  // La firma del script tiene que ser la misma que autoriza la cabecera.
  expect(bloque?.[0]).toContain(`nonce="${nonceDePolitica}"`);

  const datos = JSON.parse(
    (bloque?.[1] ?? "{}").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  );
  expect(datos["@type"]).toBe("VisualArtwork");
});
