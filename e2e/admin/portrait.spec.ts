import { expect, test } from "@playwright/test";
import { samplePaintingPng } from "../fixtures/images";
import { SEEDED_ARTIST, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminArtist } });

test("subir y quitar el retrato de la artista", async ({ page }) => {
  test.setTimeout(60_000);

  await test.step("sin retrato al principio", async () => {
    await page.goto("/admin/artista");
    await expect(page.getByText("Todavía no hay retrato")).toBeVisible();

    await page.goto("/artista");
    await expect(page.locator("picture img")).toHaveCount(0);
  });

  await test.step("subir el retrato", async () => {
    await page.goto("/admin/artista");
    await page.getByLabel("Fichero de retrato").setInputFiles({
      name: "retrato.png",
      mimeType: "image/png",
      buffer: await samplePaintingPng({ r: 90, g: 70, b: 130 }),
    });
    await page.getByRole("button", { name: "Subir retrato" }).click();

    await expect(
      page.getByRole("button", { name: "Quitar retrato" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cambiar retrato" }),
    ).toBeVisible();
  });

  await test.step("se ve en la ficha pública, con srcset real", async () => {
    await page.goto("/artista");

    const img = page.locator("picture img").first();
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src).toMatch(/^\/api\/uploads\/artist\/.+\/\d+\.webp$/);

    await expect(
      page.getByRole("heading", { level: 1, name: SEEDED_ARTIST.name }),
    ).toBeVisible();
  });

  await test.step("quitar el retrato", async () => {
    await page.goto("/admin/artista");
    await page.getByRole("button", { name: "Quitar retrato" }).click();

    await expect(page.getByText("Todavía no hay retrato")).toBeVisible();

    await page.goto("/artista");
    await expect(page.locator("picture img")).toHaveCount(0);
  });
});
