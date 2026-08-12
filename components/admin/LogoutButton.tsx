"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          // Igual que al entrar: el refresh posterior competiría con esta
          // navegación y podría dejarla a medias.
          router.replace("/admin/login");
        });
      }}
      className="text-[color:var(--color-ink-soft)] underline"
    >
      Salir
    </button>
  );
}
