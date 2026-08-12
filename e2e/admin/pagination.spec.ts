import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../lib/generated/prisma/client.js";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminPaintings } });

const adminListLinks = "main ul > li a[href^='/admin/obras/']";

test("el buscador filtra por título y desactiva el reordenado", async ({
  page,
}) => {
  const painting = seeded("amanecer-en-el-estudio");

  await page.goto("/admin");
  await page.getByLabel("Buscar obras por título").fill("Amanecer");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/\/admin\?q=Amanecer$/);
  await expect(page.locator(adminListLinks)).toHaveText([painting.title]);
  await expect(
    page.getByRole("button", { name: `Subir ${painting.title}` }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: `Bajar ${painting.title}` }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Quitar filtro" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(adminListLinks).first()).toBeVisible();
});

test("una búsqueda sin coincidencias lo dice y no la de un slug inexistente", async ({
  page,
}) => {
  await page.goto("/admin?q=esta-obra-no-existe-de-verdad");

  await expect(page.getByText("Ninguna obra coincide con")).toBeVisible();
  await expect(page.locator(adminListLinks)).toHaveCount(0);
});

/**
 * Rellena con obras sin fotos (rápido: sin pasar por el pipeline de sharp) y
 * las borra al terminar, para no dejar el catálogo de la suite con basura ni
 * descolocar el recuento que otros tests dan por cierto.
 */
test("pagina la lista cuando hay más de 20 obras", async ({ page }) => {
  test.setTimeout(60_000);

  const prisma = new PrismaClient();
  const FILLER_SLUG_PREFIX = "relleno-paginacion-admin-";

  try {
    const totalBefore = await prisma.painting.count();
    const last = await prisma.painting.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const startPosition = (last?.position ?? -1) + 1;

    await prisma.painting.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({
        slug: `${FILLER_SLUG_PREFIX}${i}`,
        title: `Relleno paginación admin ${i}`,
        widthCm: 10,
        heightCm: 10,
        published: false,
        position: startPosition + i,
      })),
    });

    const total = totalBefore + 20;

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: `Obras (${total})` }),
    ).toBeVisible();
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await expect(page.locator(adminListLinks)).toHaveCount(20);

    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/\/admin\?page=2$/);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await expect(page.locator(adminListLinks)).toHaveCount(total - 20);

    await page.getByRole("link", { name: "Anterior" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
  } finally {
    await prisma.painting.deleteMany({
      where: { slug: { startsWith: FILLER_SLUG_PREFIX } },
    });
    await prisma.$disconnect();
  }
});
