"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";
import { createMilestone } from "@/lib/admin/milestone-actions";
import { MILESTONE_ORDER, MILESTONE_SINGULAR } from "@/lib/milestones";

const campo =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

function Anadir() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Añadir"}
    </button>
  );
}

export function MilestoneForm() {
  const [estado, formAction] = useActionState<ActionState, FormData>(
    createMilestone,
    {},
  );

  return (
    <form
      action={formAction}
      // key: al guardar con éxito el formulario se vuelve a montar y queda
      // vacío para el siguiente hito, que es lo que uno va a hacer.
      key={estado.ok ? "limpio" : "escribiendo"}
      className="grid max-w-2xl gap-4 rounded border border-[color:var(--color-canvas-dim)] bg-white p-4"
    >
      {estado.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {estado.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="block text-sm font-medium" htmlFor="kind">
            Tipo
          </label>
          <select id="kind" name="kind" className={campo} defaultValue="EXHIBITION">
            {MILESTONE_ORDER.map((tipo) => (
              <option key={tipo} value={tipo}>
                {MILESTONE_SINGULAR[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="year">
            Año
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            required
            defaultValue={new Date().getFullYear()}
            className={`${campo} w-28`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="title">
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="«La luz de enero», individual"
          className={campo}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="place">
          Dónde
        </label>
        <input
          id="place"
          name="place"
          maxLength={200}
          placeholder="Sala Municipal, Valladolid"
          className={campo}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="url">
          Enlace
          <span className="ml-2 font-normal text-[color:var(--color-ink-soft)]">
            opcional
          </span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://…"
          className={campo}
        />
      </div>

      <div>
        <Anadir />
      </div>
    </form>
  );
}
