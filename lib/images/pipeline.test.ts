import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  PIPELINE_WIDTHS,
  resolveUploadPath,
  storeArtistPortrait,
  storePaintingImage,
} from "./pipeline";
import { isServableVariant, srcSet } from "./urls";

let uploadsDir: string;

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 140, g: 63, b: 36 },
    },
  })
    .jpeg()
    .toBuffer();
}

beforeEach(async () => {
  uploadsDir = await mkdtemp(join(tmpdir(), "uploads-"));
});

afterEach(async () => {
  await rm(uploadsDir, { recursive: true, force: true });
});

describe("storePaintingImage", () => {
  it("genera avif y webp en cada ancho disponible", async () => {
    const result = await storePaintingImage({
      buffer: await jpeg(2000, 1500),
      paintingId: "p1",
      imageId: "i1",
      uploadsDir,
    });

    expect(result.widths).toEqual([400, 800, 1600]);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1500);

    const files = await readdir(join(uploadsDir, "paintings", "p1", "i1"));
    expect(files.sort()).toEqual(
      [
        "1600.avif",
        "1600.webp",
        "400.avif",
        "400.webp",
        "800.avif",
        "800.webp",
        "orig.jpg",
      ].sort(),
    );
  });

  it("no amplía: omite los anchos mayores que el original", async () => {
    const result = await storePaintingImage({
      buffer: await jpeg(900, 600),
      paintingId: "p1",
      imageId: "i2",
      uploadsDir,
    });

    expect(result.widths).toEqual([400, 800]);
  });

  it("conserva el ancho mínimo aunque el original sea diminuto", async () => {
    const result = await storePaintingImage({
      buffer: await jpeg(120, 90),
      paintingId: "p1",
      imageId: "i3",
      uploadsDir,
    });

    expect(result.widths).toEqual([400]);
  });

  it("devuelve un placeholder base64 pequeño", async () => {
    const result = await storePaintingImage({
      buffer: await jpeg(1200, 900),
      paintingId: "p1",
      imageId: "i4",
      uploadsDir,
    });

    expect(result.blurDataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(result.blurDataUrl.length).toBeLessThan(2000);
  });

  it("rechaza un fichero que no es imagen aunque tenga extensión de imagen", async () => {
    await expect(
      storePaintingImage({
        buffer: Buffer.from("<?php echo 'hola'; ?>"),
        paintingId: "p1",
        imageId: "i5",
        uploadsDir,
      }),
    ).rejects.toThrow(/no es una imagen/i);
  });

  it("rechaza ficheros por encima del límite de tamaño", async () => {
    await expect(
      storePaintingImage({
        buffer: Buffer.alloc(MAX_UPLOAD_BYTES + 1),
        paintingId: "p1",
        imageId: "i6",
        uploadsDir,
      }),
    ).rejects.toThrow(/demasiado grande/i);
  });
});

describe("storeArtistPortrait", () => {
  it("escribe las mismas variantes que una foto de obra, bajo artist/<id>", async () => {
    const result = await storeArtistPortrait({
      buffer: await jpeg(1000, 1000),
      portraitId: "portrait-1",
      uploadsDir,
    });

    expect(result.basePath).toBe(join("artist", "portrait-1"));
    expect(result.widths).toEqual([400, 800]);

    const files = await readdir(join(uploadsDir, "artist", "portrait-1"));
    expect(files.sort()).toEqual(
      ["400.avif", "400.webp", "800.avif", "800.webp", "orig.jpg"].sort(),
    );
  });

  it("cada subida obtiene su propio id, sin pisar la anterior", async () => {
    const first = await storeArtistPortrait({
      buffer: await jpeg(1000, 1000),
      portraitId: "portrait-a",
      uploadsDir,
    });
    const second = await storeArtistPortrait({
      buffer: await jpeg(1000, 1000),
      portraitId: "portrait-b",
      uploadsDir,
    });

    expect(first.basePath).not.toBe(second.basePath);
  });
});

describe("resolveUploadPath", () => {
  it("resuelve rutas dentro del directorio de subidas", () => {
    expect(resolveUploadPath("/data", "paintings/p1/i1/800.webp")).toBe(
      "/data/paintings/p1/i1/800.webp",
    );
  });

  it("bloquea el path traversal", () => {
    expect(() => resolveUploadPath("/data", "../../etc/passwd")).toThrow(
      /fuera del directorio/i,
    );
    expect(() => resolveUploadPath("/data", "paintings/../../secreto")).toThrow(
      /fuera del directorio/i,
    );
  });
});

describe("anchos del pipeline", () => {
  it("coinciden con los que se usan al construir URLs", async () => {
    // Las dos listas están duplicadas a propósito (ver pipeline.ts); esto
    // impide que se separen sin que nadie se entere. Se comparan las listas y
    // no el resultado de una subida: el ancho de zoom solo se genera a partir
    // de originales de 3200 px, y crear uno aquí solo alargaría el test.
    const { IMAGE_WIDTHS } = await import("./urls");
    expect([...PIPELINE_WIDTHS]).toEqual([...IMAGE_WIDTHS]);
  });

  it("genera todos los anchos que caben en el original", async () => {
    const { widths } = await storePaintingImage({
      buffer: await jpeg(2000, 1500),
      paintingId: "p9",
      imageId: "i9",
      uploadsDir,
    });

    // 3200 no sale: nunca se amplía una imagen.
    expect(widths).toEqual([400, 800, 1600]);
  });
});

describe("isServableVariant", () => {
  it("admite las variantes generadas", () => {
    expect(isServableVariant("800.webp")).toBe(true);
    expect(isServableVariant("1600.avif")).toBe(true);
  });

  it("no sirve el original ni anchos inventados", () => {
    expect(isServableVariant("orig.jpg")).toBe(false);
    expect(isServableVariant("2400.webp")).toBe(false);
    expect(isServableVariant("800.php")).toBe(false);
    expect(isServableVariant("../800.webp")).toBe(false);
  });
});

describe("srcSet", () => {
  it("construye el srcset con los anchos generados", () => {
    expect(srcSet("paintings/p1/i1", [400, 800], "webp")).toBe(
      "/api/uploads/paintings/p1/i1/400.webp 400w, /api/uploads/paintings/p1/i1/800.webp 800w",
    );
  });
});
