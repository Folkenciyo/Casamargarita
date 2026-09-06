import type { Metadata } from "next";
import Link from "next/link";
import { RoomGate } from "@/components/webgl/RoomGate";
import { formatPrice } from "@/lib/catalog";
import { imageUrl, largestWidth } from "@/lib/images/urls";
import { obrasSalaPorSecciones } from "@/lib/public/queries";
import { ajustesPublicos } from "@/lib/settings";
import { STATUS_LABELS } from "@/lib/validation/painting";

// Render por petición. Hoy es redundante —el `<html lang>` del layout raíz
// sale de una cabecera, y eso ya hace dinámico todo el sitio—, pero se deja
// como red: sin ella, el día que el idioma deje de leerse de la cabecera Next
// intentaría prerenderizar en build, donde no hay Postgres. Lo que evita los
// viajes a la base de datos es el caché por etiquetas (lib/cache.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sala",
  description: "Recorrido por la obra colgada en una sala virtual.",
  // La galería en 2D ya cubre este contenido para los buscadores.
  robots: { index: false },
};

export default async function RoomPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string }>;
}) {
  const { showSoldPaintings } = await ajustesPublicos();
  const secciones = await obrasSalaPorSecciones(showSoldPaintings);

  const sections = secciones
    .map((seccion) => ({
      id: seccion.id,
      slug: seccion.slug,
      title: seccion.title,
      paintings: seccion.paintings
        .filter((painting) => painting.images.length > 0)
        .map((painting) => {
          const cover = painting.images[0]!;
          return {
            slug: painting.slug,
            title: painting.title,
            priceLabel:
              painting.status === "SOLD" || painting.status === "NOT_FOR_SALE"
                ? STATUS_LABELS[painting.status]
                : formatPrice(painting.priceCents, painting.currency),
            widthCm: painting.widthCm,
            heightCm: painting.heightCm,
            textureUrl: imageUrl(
              cover.basePath,
              cover.widths.includes(800) ? 800 : (cover.widths[0] ?? 400),
              "webp",
            ),
            // La lupa (Room3D) las pide a la resolución más grande que haya:
            // de cerca es donde se nota el grano si no la tiene.
            detailUrls: painting.images
              .filter((image) => image.isDetail)
              .map((image) => imageUrl(image.basePath, largestWidth(image.widths), "webp")),
          };
        }),
    }))
    .filter((seccion) => seccion.paintings.length > 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-[length:var(--text-title)]">Sala</h1>
        <Link href="/galeria" className="text-sm underline">
          Volver a la galería
        </Link>
      </div>

      {sections.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          La sala se llena con las obras que tengan foto. Todavía no hay ninguna.
        </p>
      ) : (
        <RoomGate sections={sections} initialSlug={(await searchParams).serie} />
      )}
    </>
  );
}
