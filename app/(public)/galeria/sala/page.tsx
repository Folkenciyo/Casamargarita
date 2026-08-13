import type { Metadata } from "next";
import Link from "next/link";
import { RoomGate } from "@/components/webgl/RoomGate";
import { formatPrice } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/images/urls";
import { publicPaintingWhere } from "@/lib/settings";
import { STATUS_LABELS } from "@/lib/validation/painting";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sala",
  description: "Recorrido por la obra colgada en una sala virtual.",
  // La galería en 2D ya cubre este contenido para los buscadores.
  robots: { index: false },
};

export default async function RoomPage() {
  const paintings = await prisma.painting.findMany({
    where: await publicPaintingWhere(),
    orderBy: { position: "asc" },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });

  const hangable = paintings
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
      };
    });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-[length:var(--text-title)]">Sala</h1>
        <Link href="/galeria" className="text-sm underline">
          Volver a la galería
        </Link>
      </div>

      {hangable.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          La sala se llena con las obras que tengan foto. Todavía no hay ninguna.
        </p>
      ) : (
        <RoomGate paintings={hangable} />
      )}
    </>
  );
}
