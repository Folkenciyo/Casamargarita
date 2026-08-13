import { HomeView } from "@/components/public/HomeView";

// Render por petición. Hoy es redundante —el `<html lang>` del layout raíz
// sale de una cabecera, y eso ya hace dinámico todo el sitio—, pero se deja
// como red: sin ella, el día que el idioma deje de leerse de la cabecera Next
// intentaría prerenderizar en build, donde no hay Postgres. Lo que evita los
// viajes a la base de datos es el caché por etiquetas (lib/cache.ts).
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeView lang="es" />;
}
