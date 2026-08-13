import type { Metadata } from "next";
import { MessagePage } from "@/components/public/MessagePage";

// Alcance global: cualquier URL que no encaje con ninguna ruta cae aquí, y
// eso incluye las de fuera del grupo público, sin cabecera ni pie.
export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <MessagePage code="404" title="Aquí no cuelga nada">
        La dirección no existe o la obra ya no está publicada.
      </MessagePage>
    </main>
  );
}
