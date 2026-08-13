import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../lib/generated/prisma/client.js";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminPaintings } });

const adminListLinks = "main ul > li a[href^='/admin/obras/']";

test("el buscador filtra por título y desactiva el reordenado", async ({
  page,
}) => {
  const painting = seeded("amanecer-en-el-estudio");

  await page.goto("/admin/obras");
  await page.getByLabel("Buscar").fill("Amanecer");
  await page.getByRole("button", { name: "Filtrar" }).click();

  // La página redirige para quitar los campos vacíos que manda el formulario.
  await expect(page).toHaveURL(/\/admin\/obras\?q=Amanecer$/);
  await expect(page.locator(adminListLinks)).toHaveText([painting.title]);
  await expect(
    page.getByRole("button", { name: `Subir ${painting.title}` }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: `Bajar ${painting.title}` }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Quitar filtros" }).click();
  await expect(page).toHaveURL(/\/admin\/obras$/);
  await expect(page.locator(adminListLinks).first()).toBeVisible();
});

test("una búsqueda sin coincidencias lo dice y no la de un slug inexistente", async ({
  page,
}) => {
  await page.goto("/admin/obras?q=esta-obra-no-existe-de-verdad");

  await expect(page.getByText("Ninguna obra coincide")).toBeVisible();
  await expect(page.locator(adminListLinks)).toHaveCount(0);
});

test("el filtro de estado deja solo las obras de ese estado", async ({
  page,
}) => {
  const sold = seeded("bodegon-vendido");

  await page.goto("/admin/obras?estado=SOLD");

  await expect(page.locator(adminListLinks)).toHaveText([sold.title]);
});

test("el filtro de visibilidad separa publicadas de ocultas", async ({
  page,
}) => {
  const hidden = seeded("borrador-oculto");

  await page.goto("/admin/obras?visibilidad=ocultas");

  await expect(page.locator(adminListLinks)).toHaveText([hidden.title]);
});

/**
 * Publica y vuelve a ocultar la misma obra: el estado de la suite queda como
 * estaba y los tests públicos siguen dando por cierto que no se ve.
 */
test("se puede publicar y ocultar desde la lista", async ({ page }) => {
  const hidden = seeded("borrador-oculto");
  const row = page.locator("main ul > li", { hasText: hidden.title });

  // Texto exacto: el botón "Ocultar" contiene la palabra "Oculta", así que
  // buscarla suelta en la fila daría verde con la obra publicada.
  const badge = (text: string) => row.getByText(text, { exact: true });

  // Se filtra por título y no por visibilidad: así la fila no se sale de la
  // lista al cambiar de estado y no hace falta navegar entre clic y clic —
  // navegar ahí cortaría la Server Action a medias.
  await page.goto(`/admin/obras?q=${encodeURIComponent(hidden.title)}`);
  await expect(badge("Oculta")).toBeVisible();

  await row.getByRole("button", { name: "Publicar" }).click();
  await expect(badge("Publicada")).toBeVisible();

  await row.getByRole("button", { name: "Ocultar" }).click();
  await expect(badge("Oculta")).toBeVisible();
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

    await page.goto("/admin/obras");
    await expect(
      page.getByRole("heading", { name: `Obras (${total})` }),
    ).toBeVisible();
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await expect(page.locator(adminListLinks)).toHaveCount(20);

    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/\/admin\/obras\?page=2$/);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await expect(page.locator(adminListLinks)).toHaveCount(total - 20);

    await page.getByRole("link", { name: "Anterior" }).click();
    await expect(page).toHaveURL(/\/admin\/obras$/);
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
  } finally {
    await prisma.painting.deleteMany({
      where: { slug: { startsWith: FILLER_SLUG_PREFIX } },
    });
    await prisma.$disconnect();
  }
});
