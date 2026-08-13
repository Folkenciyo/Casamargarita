import type { Metadata } from "next";
import { GalleryView, type GalleryParams } from "@/components/public/GalleryView";

// Render por petición. Hoy es redundante —el `<html lang>` del layout raíz
// sale de una cabecera, y eso ya hace dinámico todo el sitio—, pero se deja
// como red: sin ella, el día que el idioma deje de leerse de la cabecera Next
// intentaría prerenderizar en build, donde no hay Postgres. Lo que evita los
// viajes a la base de datos es el caché por etiquetas (lib/cache.ts).
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
