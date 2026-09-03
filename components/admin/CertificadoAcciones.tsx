"use client";

import { useState } from "react";
// Tipo solo: el componente en sí se importa dinámicamente al pulsar el
// botón, para no meter @react-pdf/renderer en el paquete inicial del panel.
import type { CertificadoPdfProps } from "@/components/admin/CertificadoPdf";

/**
 * Convierte cualquier imagen que el navegador sepa decodificar (aquí, un
 * WEBP servido por el pipeline) a un PNG en memoria. @react-pdf/renderer no
 * trae decodificador de WEBP/AVIF propio — solo PNG y JPEG — así que se
 * aprovecha el decodificador del propio navegador en vez de arriesgarse a
 * que la foto de portada salga en blanco en el PDF.
 */
async function aPng(url: string): Promise<string> {
  const imagen = new Image();
  imagen.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    imagen.onload = () => resolve();
    imagen.onerror = () => reject(new Error("No se pudo leer la imagen"));
    imagen.src = url;
  });

  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.naturalWidth;
  lienzo.height = imagen.naturalHeight;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar la imagen");
  contexto.drawImage(imagen, 0, 0);
  return lienzo.toDataURL("image/png");
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function CertificadoAcciones({
  painting,
  artistName,
  coverUrl,
}: {
  painting: CertificadoPdfProps["painting"];
  artistName: string;
  coverUrl: string | null;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargarPdf() {
    setGenerando(true);
    setError(null);
    try {
      const [{ pdf }, { CertificadoPdf }, logoUrl, coverPng] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/admin/CertificadoPdf"),
        aPng("/Logotipocompletoimg.png"),
        coverUrl ? aPng(coverUrl) : Promise.resolve(null),
      ]);

      const blob = await pdf(
        <CertificadoPdf
          painting={painting}
          artistName={artistName}
          coverUrl={coverPng}
          logoUrl={logoUrl}
        />,
      ).toBlob();

      descargar(blob, `certificado-${painting.slug}.pdf`);
    } catch {
      setError("No se pudo generar el PDF. Prueba a imprimir en su lugar.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void descargarPdf()}
          disabled={generando}
          className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-sm text-[color:var(--color-canvas)] disabled:opacity-50"
        >
          {generando ? "Generando…" : "Descargar PDF"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-[color:var(--color-ink)] px-4 py-2 text-sm"
        >
          Imprimir
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
