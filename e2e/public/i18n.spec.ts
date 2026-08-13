import { expect, test } from "@playwright/test";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicI18n } });

const obra = seeded("amanecer-en-el-estudio");

test("la galería en inglés traduce la interfaz y conserva las obras", async ({
  page,
}) => {
  await page.goto("/en/galeria");

  await expect(page.getByRole("heading", { level: 1, name: "Gallery" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Available only" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Large format" })).toBeVisible();

  // La obra es la misma; lo que cambia es cómo se dice todo lo demás.
  await expect(
    page.locator(`a[href="/en/obra/${obra.slug}"]`).first(),
  ).toBeVisible();
});

test("los enlaces internos en inglés no se salen del idioma", async ({ page }) => {
  await page.goto("/en/galeria");
  await page.locator(`a[href="/en/obra/${obra.slug}"]`).first().click();

  await expect(page).toHaveURL(new RegExp(`/en/obra/${obra.slug}$`));
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
});

test("el documento se anuncia en el idioma correcto", async ({ page }) => {
  await page.goto("/galeria");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.goto("/en/galeria");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("el selector cambia de idioma sin sacarte de la página", async ({ page }) => {
  await page.goto(`/obra/${obra.slug}`);

  // waitForURL y no toHaveURL tras el clic: la navegación del selector la
  // resuelve el router en cliente y hay que esperarla, no comprobarla al vuelo.
  await Promise.all([
    page.waitForURL(new RegExp(`/en/obra/${obra.slug}$`)),
    page.getByRole("link", { name: "EN", exact: true }).click(),
  ]);

  await Promise.all([
    page.waitForURL(new RegExp(`/obra/${obra.slug}$`)),
    page.getByRole("link", { name: "ES", exact: true }).click(),
  ]);
});

/**
 * Desde una página que solo existe en español, cambiar de idioma lleva a la
 * portada en inglés en lugar de a un 404.
 */
test("desde una página sin versión inglesa lleva a la portada", async ({
  page,
}) => {
  await page.goto("/artista");

  await Promise.all([
    page.waitForURL(/\/en$/),
    page.getByRole("link", { name: "EN", exact: true }).click(),
  ]);
});

test("las fichas declaran su equivalente en el otro idioma", async ({
  request,
}) => {
  const respuesta = await request.get(`/obra/${obra.slug}`);
  const html = await respuesta.text();

  // Sin distinguir mayúsculas: Next lo serializa como `hrefLang`, y en HTML
  // los nombres de atributo dan igual en mayúscula o minúscula.
  expect(html).toMatch(/hreflang="en"/i);
  expect(html).toContain(`/en/obra/${obra.slug}`);
  expect(html).toMatch(/rel="canonical"/i);
});
