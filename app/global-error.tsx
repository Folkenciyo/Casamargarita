"use client";

import { useEffect } from "react";

/**
 * Última red: se usa cuando el fallo ocurre en el layout raíz, así que este
 * fichero tiene que traer su propio <html> y <body> y no puede depender de
 * nada del resto de la app, ni siquiera de las variables de la hoja de estilo.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("error en el layout raíz", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          background: "#f4f0e8",
          color: "#1a1714",
          fontFamily: "Georgia, serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 400, margin: 0 }}>
            La galería no ha podido abrir
          </h1>
          <p style={{ color: "#6b655d", lineHeight: 1.6 }}>
            Ha ocurrido un error inesperado. Vuelve a intentarlo en unos
            segundos.
            {error.digest ? ` Referencia: ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#1a1714",
              color: "#f4f0e8",
              border: 0,
              borderRadius: 4,
              padding: "0.6rem 1.2rem",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
