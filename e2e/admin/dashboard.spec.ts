import { expect, test } from "@playwright/test";
import { TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminDashboard } });

/**
 * El resumen se mira, no se toca: no hay asertos sobre cifras exactas porque
 * otros ficheros crean y borran obras. Lo que sí tiene que cumplirse siempre
 * es que las cifras estén, lleven a donde dicen y no se inventen secciones.
 */
test("el resumen enseña las cifras del catálogo y lleva a la lista", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();

  for (const label of [
    "Obras en catálogo",
    "Disponibles",
    "Vendidas",
    "Consultas pendientes",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  await expect(
    page.getByRole("heading", { name: "Últimas consultas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Últimas obras añadidas" }),
  ).toBeVisible();

  // La tarjeta de vendidas es un enlace a la lista ya filtrada.
  await page.getByRole("link", { name: /Vendidas/ }).click();
  await expect(page).toHaveURL(/\/admin\/obras\?estado=SOLD$/);
});

test("avisa de las obras que no tienen ninguna foto", async ({ page }) => {
  await page.goto("/admin");

  // El sembrado deja dos obras sin foto a propósito.
  const notice = page.getByText(/obras? sin ninguna foto/);
  await expect(notice).toBeVisible();

  await notice.getByRole("link", { name: "Verlas" }).click();
  await expect(page).toHaveURL(/\/admin\/obras\?foto=sin$/);

  // Dentro de la lista: "Sin foto" también es una opción del propio filtro,
  // y getByText no distingue mayúsculas. Se apunta a la lista de obras por su
  // nombre accesible y no a "main ul" a secas: con dos o más destacadas,
  // FeaturedOrder mete su propia <ul> antes en el DOM (el sembrado deja
  // "Amanecer en el estudio" y "Bodegón vendido" como featured), y `.first()`
  // sin cualificar cogía esa lista en vez de la de obras.
  await expect(
    page.getByRole("list", { name: "Obras" }).locator("li").first(),
  ).toContainText("sin foto");
});

test("la navegación del panel marca dónde estás", async ({ page }) => {
  await page.goto("/admin/obras");

  await expect(page.getByRole("link", { name: "Obras", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("link", { name: "Resumen" }),
  ).not.toHaveAttribute("aria-current", "page");
});
