import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Tarjeta por defecto al compartir la portada, la galería o la ficha de
// artista. La ficha de obra no la usa: allí manda la propia pintura.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f0e8",
          padding: 80,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#6b655d",
          }}
        >
          Óleo sobre lienzo
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 92, color: "#1a1714" }}>
            {SITE_NAME}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#6b655d" }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        {/* La misma pincelada del favicon, a lo ancho de la tarjeta. */}
        <div
          style={{ display: "flex", height: 14, background: "#8c3f24", width: 320 }}
        />
      </div>
    ),
    size,
  );
}
