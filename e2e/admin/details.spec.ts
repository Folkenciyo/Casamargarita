import { expect, test } from "@playwright/test";
import { DETAIL_COUNT, DETAIL_MIN_SOURCE_PX } from "../../lib/images/details";
import { heavyPaintingJpeg, samplePaintingPng } from "../fixtures/images";
import { TEST_IPS } from "../fixtures/test-data";
import { revalidarCache } from "../fixtures/revalidar";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminDetails } });

/** Con holgura sobre el umbral: el test no puede depender del redondeo. */
const LADO_LARGO = DETAIL_MIN_SOURCE_PX + 600;
const LADO_CORTO = DETAIL_MIN_SOURCE_PX + 100;

const botonDetalles = /Generar \d+ fotos de detalle/;

test("los detalles se recortan de la principal, y solo si da la resolución", async ({
  page,
}) => {
  test.setTimeout(240_000);

  let obraUrl = "";
  const titulo = `Detalles E2E ${Date.now()}`;

  await test.step("con una foto pequeña se explica por qué no se puede", async () => {
    await page.goto("/admin/obras/nueva");
    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel("Ancho (cm)").fill("100");
    await page.getByLabel("Alto (cm)").fill("75");
    await page.getByRole("button", { name: "Crear obra" }).click();
    await expect(page).toHaveURL(/\/admin\/obras\/(?!nueva$)[^/]+$/);
    obraUrl = page.url();

    await page.getByLabel("Fichero de imagen").setInputFiles({
      name: "pequena.png",
      mimeType: "image/png",
      buffer: await samplePaintingPng({ r: 120, g: 90, b: 60 }),
    });
    await expect(page.getByRole("heading", { name: "Fotos (1)" })).toBeVisible();

    // Ni botón escondido sin más ni botón que promete lo que no puede dar.
    await expect(page.getByRole("button", { name: botonDetalles })).toHaveCount(0);
    await expect(
      page.getByText(`hacen falta ${DETAIL_MIN_SOURCE_PX} px por el lado corto`),
    ).toBeVisible();
  });

  await test.step("con una foto grande se generan", async () => {
    await page.getByLabel("Fichero de imagen").setInputFiles({
      name: "grande.jpg",
      mimeType: "image/jpeg",
      buffer: await heavyPaintingJpeg(LADO_LARGO, LADO_CORTO),
    });
    await expect(page.getByRole("heading", { name: "Fotos (2)" })).toBeVisible({
      timeout: 90_000,
    });

    // La grande no es la principal —lo es la primera que se subió—, así que
    // aún no hay resolución para recortar.
    await expect(page.getByRole("button", { name: botonDetalles })).toHaveCount(0);

    const fotos = page.getByRole("list", { name: "Fotos de la obra" });
    await fotos
      .locator("> li")
      .nth(1)
      .getByRole("button", { name: "Hacer principal" })
      .click();

    const boton = page.getByRole("button", { name: botonDetalles });
    await expect(boton).toBeVisible();
    await boton.click();

    await expect(
      page.getByRole("heading", { name: `Fotos (${2 + DETAIL_COUNT})` }),
    ).toBeVisible({ timeout: 120_000 });
    await expect(page.locator("main [role='alert']")).toHaveCount(0);
  });

  await test.step("cada detalle lleva su descripción", async () => {
    const fotos = page.getByRole("list", { name: "Fotos de la obra" });
    await expect(fotos.getByAltText("Detalle de la pincelada")).toBeVisible();
    await expect(fotos.getByAltText("Detalle del empaste")).toBeVisible();
    await expect(fotos.getByAltText("Detalle de la materia")).toBeVisible();
  });

  await test.step("se ven en la ficha pública", async () => {
    await revalidarCache(page.request);

    const href = await page
      .getByRole("link", { name: /Ver en la web/ })
      .getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!);
    // La principal arriba y los detalles debajo, cada uno con su visor.
    await expect(page.locator("picture img")).toHaveCount(2 + DETAIL_COUNT);
  });

  // Del todo, no a la papelera: lo que queda ahí sigue contando para
  // `painting.count()`, de donde saca su recuento el test de paginación.
  await test.step("recoger", async () => {
    page.on("dialog", (dialogo) => void dialogo.accept());
    await page.goto(obraUrl);
    await page.getByRole("button", { name: "Borrar esta obra" }).click();
    await expect(page).toHaveURL(/\/admin\/obras\?papelera=si$/);

    const fila = page.locator("main ul > li", { hasText: titulo });
    await fila.getByRole("button", { name: "Borrar ya" }).click();
    await expect(page.getByText(titulo)).toHaveCount(0);
  });
});
