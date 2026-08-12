import { expect, test } from "@playwright/test";
import { formatDimensions, formatPrice, PRICE_ON_REQUEST } from "../../lib/catalog";
import { STATUS_LABELS } from "../../lib/validation/painting";
import {
  E2E_BASE_URL,
  SEEDED_ARTIST,
  seeded,
  TEST_IPS,
} from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicPages } });

const hero = seeded("amanecer-en-el-estudio");
const sold = seeded("bodegon-vendido");
const onRequest = seeded("retrato-a-consultar");
const hidden = seeded("borrador-oculto");

test("la portada muestra el lema, la obra destacada y lleva a la galería", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: SEEDED_ARTIST.statement }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: SEEDED_ARTIST.name }),
  ).toBeVisible();

  // La primera destacada es la portada; el resto va en "Obra destacada".
  await expect(
    page.locator(`a[href="/obra/${hero.slug}"]`).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Obra destacada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: new RegExp(sold.title) }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ver la galería" }).click();
  await expect(page).toHaveURL(/\/galeria$/);
});

test("la galería lista la obra publicada y esconde los borradores", async ({
  page,
}) => {
  await page.goto("/galeria");

  await expect(page.getByRole("heading", { level: 1, name: "Galería" })).toBeVisible();

  for (const painting of [hero, sold, onRequest]) {
    await expect(
      page.locator(`a[href="/obra/${painting.slug}"]`),
    ).toBeVisible();
  }

  await expect(page.locator(`a[href="/obra/${hidden.slug}"]`)).toHaveCount(0);
  await expect(page.getByText(hidden.title)).toHaveCount(0);
});

test("cada tarjeta muestra medidas y precio o estado", async ({ page }) => {
  await page.goto("/galeria");

  const heroCard = page.locator("article").filter({
    has: page.locator(`a[href="/obra/${hero.slug}"]`),
  });
  await expect(heroCard).toContainText(
    formatDimensions(hero.widthCm, hero.heightCm),
  );
  await expect(heroCard).toContainText(formatPrice(hero.priceCents));

  // Una obra vendida no muestra precio en la tarjeta: muestra el estado.
  const soldCard = page.locator("article").filter({
    has: page.locator(`a[href="/obra/${sold.slug}"]`),
  });
  await expect(soldCard).toContainText(STATUS_LABELS.SOLD);
  await expect(soldCard).not.toContainText(formatPrice(sold.priceCents));

  const onRequestCard = page.locator("article").filter({
    has: page.locator(`a[href="/obra/${onRequest.slug}"]`),
  });
  await expect(onRequestCard).toContainText(PRICE_ON_REQUEST);
});

test("la ficha de artista muestra nombre, lema, biografía y contacto", async ({
  page,
}) => {
  await page.goto("/artista");

  await expect(
    page.getByRole("heading", { level: 1, name: SEEDED_ARTIST.name }),
  ).toBeVisible();
  await expect(page.getByText(SEEDED_ARTIST.statement)).toBeVisible();
  await expect(page.getByText(SEEDED_ARTIST.bio)).toBeVisible();
  await expect(
    page.getByRole("link", { name: SEEDED_ARTIST.email }).first(),
  ).toHaveAttribute("href", `mailto:${SEEDED_ARTIST.email}`);
});

test("la navegación del encabezado recorre las tres vistas públicas", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Galería", exact: true }).click();
  await expect(page).toHaveURL(/\/galeria$/);

  await page.getByRole("link", { name: "La artista" }).click();
  await expect(page).toHaveURL(/\/artista$/);

  await page.getByRole("link", { name: SEEDED_ARTIST.name }).click();
  await expect(page).toHaveURL(`${E2E_BASE_URL}/`);
});
