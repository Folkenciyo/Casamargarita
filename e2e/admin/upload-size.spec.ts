import { expect, test } from "@playwright/test";
import { heavyPaintingJpeg } from "../fixtures/images";
import { TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminUploadSize } });

/**
 * Fotos del tamaño real, las de la cámara, en los dos sitios donde se suben.
 *
 * El resto de la suite usa imágenes de color plano que pesan unos kilobytes, y
 * con esas nunca se llegó a tocar el techo de las Server Actions: el panel
 * rechazaba en silencio cualquier foto de verdad mientras los tests seguían en
 * verde. De ahí que este fichero exista aparte y con su propia imagen pesada.
 */
const TITULO = `Foto pesada ${Date.now()}`;

test("una foto de varios megas entra en la ficha de obra y en el diario", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const foto = await heavyPaintingJpeg();
  // Si el fixture dejara de pesar, este test pasaría sin comprobar nada.
  expect(foto.byteLength).toBeGreaterThan(2 * 1024 * 1024);

  const adjunto = {
    name: "obra.jpg",
    mimeType: "image/jpeg",
    buffer: foto,
  };

  let obraUrl = "";
  let entradaUrl = "";

  await test.step("una obra nueva acepta la foto", async () => {
    await page.goto("/admin/obras/nueva");
    await page.getByLabel("Título").fill(TITULO);
    await page.getByLabel("Ancho (cm)").fill("100");
    await page.getByLabel("Alto (cm)").fill("70");
    await page.getByRole("button", { name: "Crear obra" }).click();
    await expect(page).toHaveURL(/\/admin\/obras\/(?!nueva$)[^/]+$/);
    obraUrl = page.url();

    await page.getByLabel("Fichero de imagen").setInputFiles(adjunto);

    await expect(page.getByRole("heading", { name: "Fotos (1)" })).toBeVisible({
      timeout: 60_000,
    });
    // Dentro de `main`: fuera vive el anuncio de ruta que Next inserta en
    // desarrollo, que también es un `role="alert"` y no tiene nada que ver.
    await expect(page.locator("main [role='alert']")).toHaveCount(0);
  });

  await test.step("una entrada del diario acepta la foto", async () => {
    await page.goto("/admin/diario/nueva");
    await page.getByLabel("Título").fill(TITULO);
    await page.getByRole("button", { name: "Crear entrada" }).click();
    await expect(page).toHaveURL(/\/admin\/diario\/(?!nueva$)[^/]+$/);
    entradaUrl = page.url();

    await page.getByLabel("Foto del proceso").setInputFiles(adjunto);
    await page.getByRole("button", { name: "Añadir foto" }).click();

    await expect(
      page.getByRole("heading", { name: "Fotos del proceso (1)" }),
    ).toBeVisible({ timeout: 60_000 });
    // Dentro de `main`: fuera vive el anuncio de ruta que Next inserta en
    // desarrollo, que también es un `role="alert"` y no tiene nada que ver.
    await expect(page.locator("main [role='alert']")).toHaveCount(0);
  });

  // Nadie deja el estado peor de lo que lo encontró. Y hasta el final: una
  // obra olvidada en la papelera sigue contando para `painting.count()`, que es
  // de donde saca su recuento el test de paginación.
  await test.step("recoger", async () => {
    page.on("dialog", (dialogo) => void dialogo.accept());

    await page.goto(entradaUrl);
    await page.getByRole("button", { name: "Borrar esta entrada" }).click();
    await expect(page).toHaveURL(/\/admin\/diario$/);

    await page.goto(obraUrl);
    await page.getByRole("button", { name: "Borrar esta obra" }).click();
    await expect(page).toHaveURL(/\/admin\/obras\?papelera=si$/);

    const fila = page.locator("main ul > li", { hasText: TITULO });
    await fila.getByRole("button", { name: "Borrar ya" }).click();
    await expect(page.getByText(TITULO)).toHaveCount(0);
  });
});
