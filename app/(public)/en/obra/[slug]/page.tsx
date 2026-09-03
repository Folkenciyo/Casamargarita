import type { Metadata } from "next";
import {
  PaintingView,
  getPainting,
  type PaintingParams,
} from "@/components/public/PaintingView";
import { formatDimensions } from "@/lib/catalog";
import { imageUrl } from "@/lib/images/urls";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: PaintingParams;
}): Promise<Metadata> {
  const painting = await getPainting((await params).slug);
  if (!painting) return { title: "Work not found" };

  const cover = painting.images[0];
  return {
    title: painting.title,
    // La descripción es texto de la artista y se queda en su idioma; lo que
    // se traduce es la ficha técnica.
    description:
      painting.description ??
      `${painting.technique}, ${formatDimensions(painting.widthCm, painting.heightCm)}.`,
    alternates: {
      canonical: `/en/obra/${painting.slug}`,
      languages: { es: `/obra/${painting.slug}` },
    },
    openGraph: {
      type: "article",
      title: painting.title,
      // Sin foto: se omite la clave, no un array vacío, para que herede la
      // imagen de marca en vez de anunciar "sin imagen".
      images: cover
        ? [imageUrl(cover.basePath, cover.widths.at(-1) ?? 800, "webp")]
        : undefined,
    },
  };
}

export default function EnglishPaintingPage(props: {
  params: PaintingParams;
}) {
  return <PaintingView {...props} lang="en" />;
}
