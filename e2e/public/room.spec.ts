import { expect, test } from "@playwright/test";
import { TEST_IPS } from "../fixtures/test-data";

/**
 * La sala 3D no se testea con WebGL: lo que importa es que se salte sola y
 * deje una salida cuando el equipo no puede con ella.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicRoom } });

test("con movimiento reducido la sala no se carga y ofrece la galería en 2D", async ({
  page,
}) => {
  await page.goto("/galeria/sala");

  await expect(page.getByRole("heading", { level: 1, name: "Sala" })).toBeVisible();
  await expect(page.getByText(/movimiento reducido/i)).toBeVisible();
  // Dentro de <main>: la capa de óleo tiene su propio canvas fijo fuera de él,
  // siempre presente en el DOM aunque no dibuje nada.
  await expect(page.locator("main canvas")).toHaveCount(0);

  await page.getByRole("link", { name: "Ver la galería en 2D" }).click();
  await expect(page).toHaveURL(/\/galeria$/);
});

test.describe("en móvil", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("la sala se salta por tamaño de pantalla", async ({ page }) => {
    await page.goto("/galeria/sala");

    await expect(page.getByText(/al menos 1024 px/i)).toBeVisible();
    await expect(page.locator("main canvas")).toHaveCount(0);
  });
});

test("la galería enlaza la sala solo en pantalla grande", async ({ page }) => {
  await page.goto("/galeria");

  // El enlace existe en el HTML, oculto por CSS por debajo de 1024 px.
  await expect(page.getByRole("link", { name: "Verla como sala" })).toBeVisible();

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(
    page.getByRole("link", { name: "Verla como sala" }),
  ).toBeHidden();
});
