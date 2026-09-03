import { cookies } from "next/headers";
import { refreshPublicViews } from "@/lib/admin/cache-refresh";
import { guardarFotoObra } from "@/lib/admin/painting-image-upload";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";
import { forbiddenIfCrossOrigin } from "@/lib/http/origin";

// sharp es un binario nativo: esta ruta no puede correr en Edge.
export const runtime = "nodejs";

/**
 * Sube una foto de obra por XHR, para poder mostrar progreso real de bytes
 * (`components/admin/MultiUpload.tsx`) — algo que ni una Server Action
 * invocada como función ni un `<form action>` exponen. Comparte el núcleo
 * (`guardarFotoObra`) con la Server Action `uploadPaintingImage`, que sigue
 * de reserva para cuando no hay JavaScript.
 *
 * `requireAdmin()` no vale aquí: hace `redirect()`, pensado para una
 * navegación, no para una petición XHR que espera JSON.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const crossOrigin = forbiddenIfCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) {
    return Response.json({ error: "Sesión caducada" }, { status: 401 });
  }

  const { id: paintingId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Selecciona una imagen" }, { status: 400 });
  }

  const resultado = await guardarFotoObra({
    paintingId,
    file,
    alt: String(formData.get("alt") ?? ""),
  });
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: 422 });
  }

  refreshPublicViews(resultado.slug);
  return Response.json({ ok: true });
}
