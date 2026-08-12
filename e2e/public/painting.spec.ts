import { expect, test } from "@playwright/test";
import { formatDimensions, formatPrice, PRICE_ON_REQUEST } from "../../lib/catalog";
import { STATUS_LABELS } from "../../lib/validation/painting";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicPages } });

const available = seeded("amanecer-en-el-estudio");
const sold = seeded("bodegon-vendido");
const onRequest = seeded("retrato-a-consultar");
const hidden = seeded("borrador-oculto");

test("la ficha de una obra disponible muestra todos sus datos", async ({
  page,
}) => {
  await page.goto(`/obra/${available.slug}`);

  await expect(
    page.getByRole("heading", { level: 1, name: available.title }),
  ).toBeVisible();

  const details = page.locator("dl");
  await expect(details).toContainText("Óleo sobre lienzo");
  await expect(details).toContainText(
    formatDimensions(available.widthCm, available.heightCm),
  );
  await expect(details).toContainText(String(available.year));
  await expect(details).toContainText(STATUS_LABELS.AVAILABLE);
  await expect(details).toContainText(formatPrice(available.priceCents));

  await expect(page.getByText(available.description)).toBeVisible();
});

test("la obra sin precio se anuncia como precio a consultar", async ({
  page,
}) => {
  await page.goto(`/obra/${onRequest.slug}`);

  await expect(page.locator("dl")).toContainText(PRICE_ON_REQUEST);
});

test("una obra vendida no muestra precio ni formulario de consulta", async ({
  page,
}) => {
  await page.goto(`/obra/${sold.slug}`);

  await expect(page.locator("dl")).toContainText(STATUS_LABELS.SOLD);
  await expect(page.locator("dl")).not.toContainText("Precio");
  await expect(
    page.getByRole("heading", { name: "¿Te interesa esta obra?" }),
  ).toHaveCount(0);
});

test("una obra sin publicar no es accesible por su URL", async ({ page }) => {
  const response = await page.goto(`/obra/${hidden.slug}`);

  expect(response?.status()).toBe(404);
});

test("un slug inexistente devuelve 404", async ({ page }) => {
  const response = await page.goto("/obra/esta-obra-no-existe");

  expect(response?.status()).toBe(404);
});

test("las variantes generadas se sirven y el original queda oculto", async ({
  page,
  request,
}) => {
  await page.goto(`/obra/${available.slug}`);

  const img = page.locator("picture img").first();
  const src = await img.getAttribute("src");
  expect(src).toMatch(/^\/api\/uploads\/paintings\/.+\/\d+\.webp$/);

  const variant = await request.get(src!);
  expect(variant.status()).toBe(200);
  expect(variant.headers()["content-type"]).toBe("image/webp");

  // La copia maestra de la artista nunca se sirve.
  const original = await request.get(src!.replace(/\d+\.webp$/, "orig.jpg"));
  expect(original.status()).toBe(404);

  // Y no se puede salir del directorio de subidas. Los ".." van codificados:
  // sin codificar los normalizaría el cliente y la ruta no llegaría a la app.
  const traversal = await request.get(
    "/api/uploads/paintings/%2e%2e/%2e%2e/%2e%2e/etc/400.webp",
  );
  expect(traversal.ok()).toBe(false);
});

test("robots y sitemap solo publican lo que toca", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).toContain("Disallow: /admin");
  expect(robotsBody).toContain("Disallow: /api/");
  expect(robotsBody).toContain("sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain(`/obra/${available.slug}`);
  expect(sitemapBody).toContain(`/obra/${sold.slug}`);
  expect(sitemapBody).not.toContain(`/obra/${hidden.slug}`);
});
