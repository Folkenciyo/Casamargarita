import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolveUploadPath, uploadsDir } from "@/lib/images/pipeline";
import { isServableVariant } from "@/lib/images/urls";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const fileName = segments.at(-1);

  if (!fileName || !isServableVariant(fileName)) {
    return new Response("No encontrado", { status: 404 });
  }

  let filePath: string;
  try {
    filePath = resolveUploadPath(uploadsDir(), segments.join("/"));
  } catch {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response("No encontrado", { status: 404 });

    const extension = fileName.split(".").pop() ?? "";
    // Las rutas incluyen el id de la imagen: el contenido de una URL dada
    // nunca cambia, así que se puede cachear para siempre.
    return new Response(
      Readable.toWeb(createReadStream(filePath)) as ReadableStream,
      {
        headers: {
          "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
          "Content-Length": String(info.size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
