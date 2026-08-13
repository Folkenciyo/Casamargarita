import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Por petición, como el resto: el nombre del sitio sale de una variable de
// entorno que en el build todavía no existe, así que prerenderizarlo dejaría
// aquí el nombre por defecto para siempre.
export const dynamic = "force-dynamic";

/**
 * Lo que necesita un móvil para guardar la web en la pantalla de inicio: el
 * nombre corto, la margarita en grande y el crema de la casa, para que la
 * franja del sistema no aparezca en blanco al abrirla.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e8",
    theme_color: "#f4f0e8",
    icons: [
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
