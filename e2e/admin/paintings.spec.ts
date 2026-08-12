import { expect, test } from "@playwright/test";
import { formatPrice, toSlug } from "../../lib/catalog";
import { samplePaintingPng } from "../fixtures/images";
import { SEEDED_PAINTINGS, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminPaintings } });

const TITLE = `Prueba E2E ${Date.now()}`;
const SLUG = toSlug(TITLE);
const PRICE_CENTS = 150000;

const seededTitles = SEEDED_PAINTINGS.map((painting) => painting.title);
const adminListLinks = "main ul > li a[href^='/admin/obras/']";

/**
 * Ciclo completo de una obra desde el panel: crearla, ponerle foto, verla
 * publicada, moverla de sitio, esconderla y borrarla. Es un único test porque
 * cada paso necesita el anterior; los `step` dan la localización del fallo.
 */
test("ciclo completo de una obra desde el panel", async ({ page }) => {
  test.setTimeout(180_000);

  let editUrl = "";

  await test.step("crear la obra", async () => {
    await page.goto("/admin/obras/nueva");

    await page.getByLabel("Título").fill(TITLE);
    await page.getByLabel("Ancho (cm)").fill("120");
    await page.getByLabel("Alto (cm)").fill("90");
    await page.getByLabel("Técnica").fill("Óleo sobre tabla");
    await page.getByLabel("Año").fill("2025");
    // Formato con separador de miles, como lo escribiría la artista.
    await page.getByLabel("Precio en euros").fill("1.500");
    await page.getByLabel("Descripción").fill("Obra creada por la suite E2E.");
    await page.getByRole("button", { name: "Crear obra" }).click();

    // El id de la obra nueva, no la propia página de creación.
    await expect(page).toHaveURL(/\/admin\/obras\/(?!nueva$)[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    editUrl = page.url();
  });

  await test.step("subir una foto", async () => {
    await expect(page.getByRole("heading", { name: "Fotos (0)" })).toBeVisible();

    await page.getByLabel("Fichero de imagen").setInputFiles({
      name: "obra.png",
      mimeType: "image/png",
      buffer: await samplePaintingPng({ r: 120, g: 60, b: 40 }),
    });
    await page
      .getByPlaceholder("Descripción para lectores de pantalla (opcional)")
      .fill("Obra de prueba");
    await page.getByRole("button", { name: "Subir foto" }).click();

    await expect(page.getByRole("heading", { name: "Fotos (1)" })).toBeVisible();
    await expect(page.getByAltText("Obra de prueba")).toBeVisible();
    await expect(page.getByText("Principal")).toBeVisible();
  });

  await test.step("reordenar las fotos y renombrar una", async () => {
    await page.getByLabel("Fichero de imagen").setInputFiles({
      name: "segunda.png",
      mimeType: "image/png",
      buffer: await samplePaintingPng({ r: 30, g: 90, b: 140 }),
    });
    await page
      .getByPlaceholder("Descripción para lectores de pantalla (opcional)")
      .fill("Segunda foto");
    await page.getByRole("button", { name: "Subir foto" }).click();

    await expect(page.getByRole("heading", { name: "Fotos (2)" })).toBeVisible();

    // evaluateAll lee el DOM al instante, sin reintentos: tras el envío del
    // formulario hay que esperar a que la revalidación del Server Action
    // termine de repintar antes de comprobar el orden.
    const photoAlts = () =>
      page
        .locator("ul li img")
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));

    await expect.poll(photoAlts).toEqual(["Obra de prueba", "Segunda foto"]);

    const secondPhoto = page
      .locator("li")
      .filter({ has: page.getByAltText("Segunda foto") });
    await secondPhoto.getByRole("button", { name: /^Adelantar foto \d+$/ }).click();

    await expect.poll(photoAlts).toEqual(["Segunda foto", "Obra de prueba"]);

    await secondPhoto
      .getByLabel(/^Descripción de la foto \d+$/)
      .fill("Foto reordenada");
    await secondPhoto.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByAltText("Foto reordenada")).toBeVisible();
    await expect(page.getByAltText("Segunda foto")).toHaveCount(0);
  });

  await test.step("verla publicada en la web", async () => {
    await page.goto("/galeria");
    await expect(page.locator(`a[href="/obra/${SLUG}"]`)).toBeVisible();

    await page.goto(`/obra/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    await expect(page.locator("dl")).toContainText(formatPrice(PRICE_CENTS));
    await expect(page.locator("dl")).toContainText("Óleo sobre tabla");
    await expect(page.locator("picture img").first()).toBeVisible();
  });

  await test.step("moverla de sitio y devolverla", async () => {
    await page.goto("/admin");
    await expect(page.locator(adminListLinks)).toHaveText([
      ...seededTitles,
      TITLE,
    ]);

    await page.getByRole("button", { name: `Subir ${TITLE}` }).click();
    const movedUp = [...seededTitles];
    const last = movedUp.pop()!;
    await expect(page.locator(adminListLinks)).toHaveText([
      ...movedUp,
      TITLE,
      last,
    ]);

    await page.getByRole("button", { name: `Bajar ${TITLE}` }).click();
    await expect(page.locator(adminListLinks)).toHaveText([
      ...seededTitles,
      TITLE,
    ]);
  });

  await test.step("esconderla de la galería", async () => {
    await page.goto(editUrl);
    await page.getByLabel("Visible en la galería").uncheck();
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByRole("status")).toContainText("Cambios guardados");

    await page.goto("/galeria");
    await expect(page.locator(`a[href="/obra/${SLUG}"]`)).toHaveCount(0);

    const response = await page.goto(`/obra/${SLUG}`);
    expect(response?.status()).toBe(404);
  });

  await test.step("borrarla junto a sus fotos", async () => {
    await page.goto(editUrl);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Borrar esta obra" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(adminListLinks)).toHaveText(seededTitles);
  });
});

test("el título es obligatorio", async ({ page }) => {
  await page.goto("/admin/obras/nueva");

  await page.getByLabel("Ancho (cm)").fill("50");
  await page.getByLabel("Alto (cm)").fill("40");
  await page.getByRole("button", { name: "Crear obra" }).click();

  // El navegador corta el envío con el `required` del propio campo.
  await expect(page).toHaveURL(/\/admin\/obras\/nueva$/);
  await expect(page.getByLabel("Título")).toBeFocused();
});
