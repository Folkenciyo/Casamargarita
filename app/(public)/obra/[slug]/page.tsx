import type { Metadata } from "next";
import {
  PaintingView,
  getPainting,
  type PaintingParams,
} from "@/components/public/PaintingView";
import { formatDimensions } from "@/lib/catalog";
import { imageUrl } from "@/lib/images/urls";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: PaintingParams;
}): Promise<Metadata> {
  const painting = await getPainting((await params).slug);
  if (!painting) return { title: "Obra no encontrada" };

  const cover = painting.images[0];
  return {
    title: painting.title,
    description:
      painting.description ??
      `${painting.technique}, ${formatDimensions(painting.widthCm, painting.heightCm)}.`,
    alternates: {
      canonical: `/obra/${painting.slug}`,
      languages: { en: `/en/obra/${painting.slug}` },
    },
    openGraph: {
      type: "article",
      title: painting.title,
      images: cover
        ? [imageUrl(cover.basePath, cover.widths.at(-1) ?? 800, "webp")]
        : [],
    },
  };
}

export default function PaintingPage(props: { params: PaintingParams }) {
  return <PaintingView {...props} lang="es" />;
}
