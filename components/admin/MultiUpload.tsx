"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPaintingImage } from "@/lib/admin/actions";

type EstadoFichero = {
  nombre: string;
  estado: "espera" | "procesando" | "hecha" | "error";
  error?: string;
};

/**
 * Subida de varias fotos a la vez, arrastrando o desde el selector.
 *
 * Van **de una en una, en serie**, no en paralelo: cada foto genera seis
 * variantes con sharp, y diez a la vez se comerían la memoria del contenedor.
 * A cambio se ve avanzar la fila, que además es lo que uno quiere mirar.
 *
 * El texto alternativo no se pide aquí: con diez ficheros no se escriben diez
 * descripciones en el momento. Se editan después, foto a foto, en la lista.
 */
export function MultiUpload({ paintingId }: { paintingId: string }) {
  const [ficheros, setFicheros] = useState<EstadoFichero[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0 || subiendo) return;

    const pendientes = Array.from(lista);
    setFicheros(
      pendientes.map((fichero) => ({
        nombre: fichero.name,
        estado: "espera" as const,
      })),
    );
    setSubiendo(true);

    for (const [indice, fichero] of pendientes.entries()) {
      setFicheros((actual) =>
        actual.map((item, i) =>
          i === indice ? { ...item, estado: "procesando" } : item,
        ),
      );

      const datos = new FormData();
      datos.set("file", fichero);

      // Una foto que falle no puede parar las demás: se marca y se sigue.
      try {
        const resultado = await uploadPaintingImage(paintingId, {}, datos);
        setFicheros((actual) =>
          actual.map((item, i) =>
            i === indice
              ? resultado.error
                ? { ...item, estado: "error", error: resultado.error }
                : { ...item, estado: "hecha" }
              : item,
          ),
        );
      } catch {
        setFicheros((actual) =>
          actual.map((item, i) =>
            i === indice
              ? { ...item, estado: "error", error: "No se pudo subir" }
              : item,
          ),
        );
      }
    }

    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";
    router.refresh();
  }

  const conError = ficheros.filter((f) => f.estado === "error");
  const hechas = ficheros.filter((f) => f.estado === "hecha").length;

  return (
    <div className="mb-6 grid gap-3 sm:max-w-md">
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastrando(false);
          void subir(evento.dataTransfer.files);
        }}
        className={`rounded border-2 border-dashed p-5 text-center transition-colors ${
          arrastrando
            ? "border-[color:var(--color-oil)] bg-[color:var(--color-canvas-dim)]/50"
            : "border-[color:var(--color-canvas-dim)]"
        }`}
      >
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Arrastra aquí las fotos, todas las que quieras, o
        </p>
        <input
          ref={entrada}
          type="file"
          name="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          aria-label="Fichero de imagen"
          disabled={subiendo}
          onChange={(evento) => void subir(evento.target.files)}
          className="mt-3 w-full text-sm"
        />
      </div>

      {ficheros.length > 0 ? (
        <ul aria-label="Progreso de la subida" className="grid gap-1 text-sm">
          {ficheros.map((fichero) => (
            <li
              key={fichero.nombre}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="truncate">{fichero.nombre}</span>
              <span
                className={
                  fichero.estado === "error"
                    ? "shrink-0 text-red-700"
                    : "shrink-0 text-[color:var(--color-ink-soft)]"
                }
              >
                {fichero.estado === "espera"
                  ? "en cola"
                  : fichero.estado === "procesando"
                    ? "procesando…"
                    : fichero.estado === "hecha"
                      ? "lista"
                      : (fichero.error ?? "error")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {conError.length > 0 ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {conError.length === 1
            ? "Una foto no se pudo subir."
            : `${conError.length} fotos no se pudieron subir.`}{" "}
          El resto sí: {hechas} de {ficheros.length}.
        </p>
      ) : null}

      {subiendo ? (
        <p role="status" className="text-sm text-[color:var(--color-ink-soft)]">
          Procesando {hechas + 1} de {ficheros.length}. No cierres la página.
        </p>
      ) : null}
    </div>
  );
}
