import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../lib/generated/prisma/client.js";
import { samplePaintingPng } from "../fixtures/images";
import { TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminTrash } });

const TITULO = "Obra para la papelera E2E";

/**
 * Lo que hace que la papelera valga para algo: que al recuperar vuelva la
 * obra entera, con sus fotos servidas desde disco. Por eso el test sube una
 * foto de verdad y la pide por HTTP después de recuperarla.
 */
test("una obra tirada se recupera con sus fotos", async ({ page, request }) => {
  test.setTimeout(120_000);

  const prisma = new PrismaClient();
  let id = "";

  try {
    await test.step("crearla con una foto", async () => {
      await page.goto("/admin/obras/nueva");
      await page.getByLabel("Título").fill(TITULO);
      await page.getByLabel("Ancho (cm)").fill("40");
      await page.getByLabel("Alto (cm)").fill("30");
      await page.getByRole("button", { name: "Crear obra" }).click();

      // El lookahead importa: sin él, quedarse en el formulario de alta
      // también cumpliría la expresión y se capturaría "nueva" como id.
      await expect(page).toHaveURL(/\/admin\/obras\/(?!nueva$)[^/]+$/);
      id = page.url().split("/").pop() ?? "";
      expect(id).not.toBe("nueva");

      // La subida arranca sola al elegir el fichero, sin botón de por medio.
      await page.getByLabel("Fichero de imagen").setInputFiles({
        name: "papelera.png",
        mimeType: "image/png",
        buffer: await samplePaintingPng({ r: 120, g: 60, b: 40 }),
      });
      await expect(page.getByRole("heading", { name: "Fotos (1)" })).toBeVisible({
        timeout: 60_000,
      });
    });

    const imagen = await prisma.image.findFirstOrThrow({
      where: { paintingId: id },
    });
    const urlFoto = `/api/uploads/${imagen.basePath}/400.webp`;

    await test.step("tirarla a la papelera", async () => {
      page.once("dialog", (dialogo) => dialogo.accept());
      await page.getByRole("button", { name: "Borrar esta obra" }).click();

      await expect(page).toHaveURL(/papelera=si/);
      await expect(page.getByRole("heading", { name: /^Papelera/ })).toBeVisible();
      await expect(page.getByText(TITULO)).toBeVisible();
    });

    await test.step("desaparece de la web y de la lista", async () => {
      await page.goto("/admin/obras");
      await expect(page.getByRole("link", { name: TITULO })).toHaveCount(0);

      const registro = await prisma.painting.findUniqueOrThrow({ where: { id } });
      const respuesta = await page.goto(`/obra/${registro.slug}`);
      expect(respuesta?.status()).toBe(404);
    });

    await test.step("pero sus fotos siguen en disco", async () => {
      // Esto es lo que separa una papelera de un borrado: los ficheros están.
      const respuesta = await request.get(urlFoto);
      expect(respuesta.status()).toBe(200);
    });

    await test.step("recuperarla la devuelve entera", async () => {
      await page.goto("/admin/obras?papelera=si");
      const fila = page.locator("main ul > li", { hasText: TITULO });
      await fila.getByRole("button", { name: "Recuperar" }).click();

      await expect(page).toHaveURL(/\/admin\/obras\/[^/?]+$/);
      await expect(
        page.getByRole("list", { name: "Fotos de la obra" }).locator("img"),
      ).toHaveCount(1);

      const registro = await prisma.painting.findUniqueOrThrow({ where: { id } });
      expect(registro.deletedAt).toBeNull();

      await page.goto("/admin/obras");
      await expect(page.getByRole("link", { name: TITULO })).toBeVisible();
    });

    await test.step("el borrado definitivo sí se lleva las fotos", async () => {
      page.once("dialog", (dialogo) => dialogo.accept());
      await page.goto(`/admin/obras/${id}`);
      await page.getByRole("button", { name: "Borrar esta obra" }).click();
      await expect(page).toHaveURL(/papelera=si/);

      const fila = page.locator("main ul > li", { hasText: TITULO });
      page.once("dialog", (dialogo) => dialogo.accept());
      await fila.getByRole("button", { name: "Borrar ya" }).click();

      await expect(page.getByText(TITULO)).toHaveCount(0);
      expect(
        await prisma.painting.findUnique({ where: { id } }),
      ).toBeNull();

      const respuesta = await request.get(urlFoto);
      expect(respuesta.status()).toBe(404);
    });
  } finally {
    if (id) {
      await prisma.painting.deleteMany({ where: { id } });
    }
    await prisma.$disconnect();
  }
});
