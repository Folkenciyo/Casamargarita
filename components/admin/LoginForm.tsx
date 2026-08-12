"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);

        const data = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        });

        if (response.ok) {
          // Solo replace. Un `router.refresh()` a continuación se aplica a la
          // ruta actual (/admin/login) y cancela la navegación en vuelo: el
          // servidor sirve /admin pero el cliente se queda en el formulario
          // con el botón bloqueado. Navegar a otra ruta ya trae RSC fresco.
          router.replace(next);
          return;
        }

        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "No se ha podido entrar");
        setPending(false);
      }}
    >
      {error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {error}
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
