import type { Metadata } from "next";
import { GalleryView, type GalleryParams } from "@/components/public/GalleryView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Original oil paintings, with size, medium and availability for each work.",
  alternates: { canonical: "/en/galeria", languages: { es: "/galeria" } },
};

/**
 * Misma vista, otro idioma. Se reutiliza el componente en lugar de
 * duplicarlo: si mañana cambian los filtros, cambian en los dos sitios a la
 * vez o no cambian en ninguno.
 */
export default function EnglishGalleryPage(props: {
  searchParams: GalleryParams;
}) {
  return <GalleryView {...props} lang="en" />;
}
