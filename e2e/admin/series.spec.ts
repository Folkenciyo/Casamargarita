import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../lib/generated/prisma/client.js";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminSeries } });

const TITULO = "Serie de prueba E2E";
const SLUG = "serie-de-prueba-e2e";

/**
 * Ciclo completo de una serie: crearla, meterle una obra, verla publicada y
 * borrarla comprobando lo que más importa —que borrar la serie no se lleva la
 * obra por delante—.
 */
test("ciclo completo de una serie", async ({ page }) => {
  test.setTimeout(90_000);

  const obra = seeded("amanecer-en-el-estudio");
  const prisma = new PrismaClient();

  try {
    await test.step("crearla", async () => {
      await page.goto("/admin/series/nueva");
      await page.getByLabel("Título de la serie").fill(TITULO);
      await page
        .getByLabel("De qué va")
        .fill("Obras reunidas por la suite de pruebas.");
      await page.getByRole("button", { name: "Crear serie" }).click();

      await expect(page).toHaveURL(/\/admin\/series$/);
      await expect(page.getByRole("link", { name: TITULO })).toBeVisible();
    });

    await test.step("asignarle una obra desde su ficha", async () => {
      const registro = await prisma.painting.findUniqueOrThrow({
        where: { slug: obra.slug },
      });
      await page.goto(`/admin/obras/${registro.id}`);

      await page.getByLabel("Serie").selectOption({ label: TITULO });
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.getByRole("status")).toContainText("Cambios guardados");
    });

    await test.step("verla publicada con su obra dentro", async () => {
      await page.goto(`/serie/${SLUG}`);

      await expect(
        page.getByRole("heading", { level: 1, name: TITULO }),
      ).toBeVisible();
      await expect(page.getByText("1 obra")).toBeVisible();
      await expect(page.locator(`a[href="/obra/${obra.slug}"]`)).toBeVisible();
    });

    await test.step("la ficha de la obra enlaza su serie", async () => {
      await page.goto(`/obra/${obra.slug}`);
      await expect(page.getByRole("link", { name: TITULO })).toHaveAttribute(
        "href",
        `/serie/${SLUG}`,
      );
    });

    await test.step("la galería deja filtrar por ella", async () => {
      await page.goto(`/galeria?serie=${SLUG}`);
      await expect(page.locator(`a[href="/obra/${obra.slug}"]`)).toBeVisible();
      await expect(page.getByText("1 obra", { exact: true })).toBeVisible();
    });

    await test.step("borrarla sin llevarse la obra", async () => {
      const serie = await prisma.series.findUniqueOrThrow({
        where: { slug: SLUG },
      });
      await page.goto(`/admin/series/${serie.id}`);

      page.once("dialog", (dialogo) => dialogo.accept());
      await page.getByRole("button", { name: "Borrar esta serie" }).click();
      await expect(page).toHaveURL(/\/admin\/series$/);

      // Lo que de verdad se comprueba aquí: la obra sigue viva y publicada.
      const despues = await prisma.painting.findUniqueOrThrow({
        where: { slug: obra.slug },
      });
      expect(despues.seriesId).toBeNull();
      expect(despues.published).toBe(true);

      await page.goto(`/obra/${obra.slug}`);
      await expect(
        page.getByRole("heading", { level: 1, name: obra.title }),
      ).toBeVisible();
    });
  } finally {
    await prisma.painting.updateMany({
      where: { slug: obra.slug },
      data: { seriesId: null },
    });
    await prisma.series.deleteMany({ where: { slug: SLUG } });
    await prisma.$disconnect();
  }
});

test("el título de la serie es obligatorio", async ({ page }) => {
  await page.goto("/admin/series/nueva");

  await page.getByRole("button", { name: "Crear serie" }).click();

  // Lo corta el `required` del propio campo, sin llegar al servidor.
  await expect(page).toHaveURL(/\/admin\/series\/nueva$/);
  await expect(page.getByLabel("Título de la serie")).toBeFocused();
});
