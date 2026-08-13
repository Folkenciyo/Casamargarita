import { HomeView } from "@/components/public/HomeView";

// Render por petición: la imagen se construye sin acceso a la base de
// datos (Postgres vive en otro contenedor), así que no se puede
// prerenderizar en build.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeView lang="es" />;
}
