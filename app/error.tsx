"use client";

import { useEffect } from "react";
import { MessagePage } from "@/components/public/MessagePage";

/**
 * Frontera de error de toda la app. Next ya oculta el mensaje real en
 * producción; aquí solo se deja constancia y se ofrece reintentar, que en la
 * mayoría de los casos (una consulta a Postgres que no llegó) basta.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("error no controlado", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <MessagePage
        code="Error"
        title="Se ha corrido la pintura"
        action={
          <button
            type="button"
            onClick={reset}
            className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)]"
          >
            Probar otra vez
          </button>
        }
      >
        Algo ha fallado al preparar esta página. Suele ser cosa de un momento.
        {error.digest ? (
          <span className="mt-2 block text-sm">
            Referencia: <code className="tabular">{error.digest}</code>
          </span>
        ) : null}
      </MessagePage>
    </main>
  );
}
