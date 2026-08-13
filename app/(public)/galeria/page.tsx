import type { Metadata } from "next";
import { GalleryView, type GalleryParams } from "@/components/public/GalleryView";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galería",
  description:
    "Catálogo de obra original al óleo, con medidas, técnica y disponibilidad.",
  alternates: { canonical: "/galeria", languages: { en: "/en/galeria" } },
};

export default function GalleryPage(props: { searchParams: GalleryParams }) {
  return <GalleryView {...props} lang="es" />;
}
