"use client";

import { useFormStatus } from "react-dom";

/**
 * Confirmación en cliente antes de una acción destructiva. El servidor no
 * confía en esto: es solo una red de seguridad para la artista.
 */
export function DangerButton({
  children,
  confirmMessage,
}: {
  children: string;
  confirmMessage: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="rounded border border-red-700 px-4 py-2 text-red-700 disabled:opacity-50"
    >
      {pending ? "Borrando…" : children}
    </button>
  );
}
