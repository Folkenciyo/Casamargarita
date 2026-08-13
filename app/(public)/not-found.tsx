import type { Metadata } from "next";
import { MessagePage } from "@/components/public/MessagePage";

// El `notFound()` de la ficha de obra busca el not-found más cercano: con
// este se queda dentro del layout público, con su cabecera y su pie.
export const metadata: Metadata = {
  title: "Obra no encontrada",
  robots: { index: false },
};

export default function PublicNotFound() {
  return (
    <MessagePage code="404" title="Esa obra no está aquí">
      Puede que se haya retirado del catálogo o que la dirección esté mal
      escrita. La galería sigue en su sitio.
    </MessagePage>
  );
}
