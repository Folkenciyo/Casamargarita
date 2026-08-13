import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../lib/generated/prisma/client.js";
import { revalidarCache } from "../fixtures/revalidar";
import { TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicPages } });

/**
 * Rellena con obras publicadas y sin foto (rápido: sin pasar por sharp) hasta
 * superar el tamaño de página de la galería, y las borra al terminar para no
 * descolocar el recuento que dan por cierto los demás tests públicos.
 */
test("la galería pagina cuando hay más de 24 obras publicadas", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const prisma = new PrismaClient();
  const FILLER_SLUG_PREFIX = "relleno-paginacion-galeria-";

  try {
    const totalBefore = await prisma.painting.count({
      where: { published: true },
    });
    const last = await prisma.painting.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const startPosition = (last?.position ?? -1) + 1;
    // Justo lo necesario para pasar de 24: si ya hubiera 24 o más publicadas
    // (no debería, pero el test no debe asumirlo a ciegas), se añade un
    // colchón generoso.
    const needed = Math.max(1, 25 - totalBefore);

    await prisma.painting.createMany({
      data: Array.from({ length: needed }, (_, i) => ({
        slug: `${FILLER_SLUG_PREFIX}${i}`,
        title: `Relleno paginación galería ${i}`,
        widthCm: 10,
        heightCm: 10,
        published: true,
        position: startPosition + i,
      })),
    });

    // El relleno ha entrado por Prisma, sin pasar por el panel: nadie ha
    // invalidado nada y la galería seguiría sirviendo el catálogo de antes.
    await revalidarCache(request);

    await page.goto("/galeria");
    await expect(page.getByText(/Página 1 de \d+/)).toBeVisible();

    const cardCountPage1 = await page.locator("article").count();
    expect(cardCountPage1).toBe(24);

    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/\/galeria\?page=2$/);
    await expect(page.getByText(/Página 2 de \d+/)).toBeVisible();

    await page.getByRole("link", { name: "Anterior" }).click();
    await expect(page).toHaveURL(/\/galeria$/);
  } finally {
    await prisma.painting.deleteMany({
      where: { slug: { startsWith: FILLER_SLUG_PREFIX } },
    });
    await prisma.$disconnect();
  }
});
