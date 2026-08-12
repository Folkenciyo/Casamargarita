import { expect, test } from "@playwright/test";
import { SEEDED_ARTIST, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminArtist } });

const NEW_BIO = "Biografía reescrita por la suite E2E.";
const NEW_INSTAGRAM = "@cristina.e2e";

/**
 * Solo se tocan biografía e Instagram: el nombre y el lema los dan por ciertos
 * los tests públicos, y la ficha vuelve a su estado al terminar.
 */
test("la ficha de artista se edita y se refleja en la web", async ({ page }) => {
  await page.goto("/admin/artista");

  await expect(page.getByLabel("Nombre")).toHaveValue(SEEDED_ARTIST.name);
  await expect(page.getByLabel("Frase de portada")).toHaveValue(
    SEEDED_ARTIST.statement,
  );

  await page.getByLabel("Biografía").fill(NEW_BIO);
  await page.getByLabel("Instagram").fill(NEW_INSTAGRAM);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("status")).toContainText("Ficha guardada");

  await page.goto("/artista");
  await expect(page.getByText(NEW_BIO)).toBeVisible();

  // El pie de página de la web pública enlaza el Instagram nuevo.
  await expect(
    page.getByRole("link", { name: NEW_INSTAGRAM }),
  ).toHaveAttribute(
    "href",
    `https://instagram.com/${NEW_INSTAGRAM.replace("@", "")}`,
  );

  await test.step("dejar la ficha como estaba", async () => {
    await page.goto("/admin/artista");
    await page.getByLabel("Biografía").fill(SEEDED_ARTIST.bio);
    await page.getByLabel("Instagram").fill(SEEDED_ARTIST.instagram);
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByRole("status")).toContainText("Ficha guardada");

    await page.goto("/artista");
    await expect(page.getByText(SEEDED_ARTIST.bio)).toBeVisible();
  });
});

test("el nombre de la artista es obligatorio", async ({ page }) => {
  await page.goto("/admin/artista");

  await page.getByLabel("Nombre").fill("");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByLabel("Nombre")).toBeFocused();
  await expect(page.getByLabel("Nombre")).toHaveValue("");

  // Y la web pública sigue mostrando el nombre de siempre.
  await page.goto("/artista");
  await expect(
    page.getByRole("heading", { level: 1, name: SEEDED_ARTIST.name }),
  ).toBeVisible();
});
