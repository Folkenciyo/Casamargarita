"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tooLargeMessage } from "@/lib/images/limits";

type EstadoFichero = {
  nombre: string;
  estado: "espera" | "procesando" | "hecha" | "error";
  /** Porcentaje de bytes ya enviados. Llega a 100 antes de que el servidor
      termine de generar las variantes con sharp: el estado sigue en
      "procesando" hasta entonces, es tiempo real, no fingido. */
  progreso: number;
  error?: string;
};

/**
 * Sube un fichero por XHR en vez de por Server Action: es la única forma de
 * conocer los bytes enviados (`xhr.upload.onprogress`) para pintar un
 * progreso real. La ruta comparte lógica con la Server Action de reserva —
 * ver `lib/admin/painting-image-upload.ts`.
 */
function subirConProgreso(
  paintingId: string,
  file: File,
  onProgreso: (porcentaje: number) => void,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/obras/${paintingId}/imagenes`);

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        onProgreso(Math.round((evento.loaded / evento.total) * 100));
      }
    };

    xhr.onload = () => {
      let cuerpo: { ok?: boolean; error?: string } = {};
      try {
        cuerpo = JSON.parse(xhr.responseText);
      } catch {
        // Respuesta no-JSON (p.ej. un 502 del proxy): se trata como fallo.
      }
      if (xhr.status >= 200 && xhr.status < 300 && cuerpo.ok) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: cuerpo.error ?? "No se pudo subir" });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: "No se pudo subir" });

    const datos = new FormData();
    datos.set("file", file);
    xhr.send(datos);
  });
}

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
        progreso: 0,
      })),
    );
    setSubiendo(true);

    for (const [indice, fichero] of pendientes.entries()) {
      // Lo que no cabe se descarta aquí: enviarlo solo sirve para esperar a que
      // suba entero y que el servidor lo rechace al final.
      const demasiado = tooLargeMessage(fichero.size);
      if (demasiado) {
        setFicheros((actual) =>
          actual.map((item, i) =>
            i === indice ? { ...item, estado: "error", error: demasiado } : item,
          ),
        );
        continue;
      }

      setFicheros((actual) =>
        actual.map((item, i) =>
          i === indice ? { ...item, estado: "procesando" } : item,
        ),
      );

      // Una foto que falle no puede parar las demás: se marca y se sigue.
      const resultado = await subirConProgreso(paintingId, fichero, (porcentaje) => {
        setFicheros((actual) =>
          actual.map((item, i) => (i === indice ? { ...item, progreso: porcentaje } : item)),
        );
      });

      setFicheros((actual) =>
        actual.map((item, i) =>
          i === indice
            ? resultado.ok
              ? { ...item, estado: "hecha", progreso: 100 }
              : { ...item, estado: "error", error: resultado.error }
            : item,
        ),
      );
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
        <ul aria-label="Progreso de la subida" className="grid gap-1.5 text-sm">
          {ficheros.map((fichero) => (
            <li key={fichero.nombre} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate">{fichero.nombre}</span>
                <span
                  className={
                    fichero.estado === "error"
                      ? // Sin `shrink-0`: el motivo del fallo es una frase entera
                        // y aquí es más útil leerla que mantener la columna.
                        "text-right text-red-700"
                      : "shrink-0 text-[color:var(--color-ink-soft)]"
                  }
                >
                  {fichero.estado === "espera"
                    ? "en cola"
                    : fichero.estado === "procesando"
                      ? fichero.progreso < 100
                        ? `subiendo ${fichero.progreso}%`
                        : "procesando…"
                      : fichero.estado === "hecha"
                        ? "lista"
                        : (fichero.error ?? "error")}
                </span>
              </div>

              {fichero.estado === "procesando" ? (
                <div
                  role="progressbar"
                  aria-label={`Progreso de ${fichero.nombre}`}
                  aria-valuenow={fichero.progreso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-canvas-dim)]"
                >
                  <div
                    className="h-full rounded-full bg-[color:var(--color-oil)] transition-[width]"
                    style={{
                      width: `${fichero.progreso}%`,
                      // Sin porcentaje real que mostrar (subida ya al 100%,
                      // esperando a sharp): la barra se anima sola para no
                      // parecer colgada.
                      animation:
                        fichero.progreso >= 100
                          ? "pulso-procesando 1.4s ease-in-out infinite"
                          : undefined,
                    }}
                  />
                </div>
              ) : null}
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
