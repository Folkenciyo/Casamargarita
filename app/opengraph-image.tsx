import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Tarjeta por defecto al compartir la portada, la galería o la ficha de
// artista. La ficha de obra/diario no la usa cuando tienen foto propia: allí
// manda la propia pintura (ver generateMetadata de esas páginas).
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

// El logo es cuadrado (1254×1254, ver public/Logotipocompleto.svg). Se lee
// en disco y se pasa como data URL: Satori (el renderer de next/og) no
// resuelve rutas relativas de /public como haría el navegador.
const logo = readFileSync(
  join(process.cwd(), "public", "Logotipocompletoimg.png"),
).toString("base64");

/**
 * El logo centrado y grande, no una composición de texto: un recorte de
 * vista previa (WhatsApp, Slack…) a veces solo enseña una esquina, y ahí
 * cualquier trozo del logo se reconoce igual — un párrafo cortado a medias,
 * no.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f0e8",
        }}
      >
        <img
          src={`data:image/png;base64,${logo}`}
          width={420}
          height={420}
          alt=""
        />

        {/* La misma pincelada del favicon, al pie de la tarjeta. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 14,
            width: "100%",
            background: "#8c3f24",
          }}
        />
      </div>
    ),
    size,
  );
}
