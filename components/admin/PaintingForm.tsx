"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/actions";
import { PAINTING_STATUSES, STATUS_LABELS } from "@/lib/validation/painting";

export type PaintingValues = {
  title: string;
  description: string;
  technique: string;
  year: number | null;
  widthCm: number | string;
  heightCm: number | string;
  priceCents: number | null;
  status: (typeof PAINTING_STATUSES)[number];
  published: boolean;
  featured: boolean;
  seriesId: string | null;
};

const EMPTY: PaintingValues = {
  title: "",
  description: "",
  technique: "Óleo sobre lienzo",
  year: null,
  widthCm: "",
  heightCm: "",
  priceCents: null,
  status: "AVAILABLE",
  published: true,
  featured: false,
  seriesId: null,
};

const field =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";
const label = "block text-sm font-medium";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function PaintingForm({
  action,
  values = EMPTY,
  submitLabel,
  series = [],
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: PaintingValues;
  submitLabel: string;
  /** Series disponibles para el desplegable. Vacío = todavía no hay ninguna. */
  series?: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="rounded bg-green-50 p-3 text-green-800">
          Cambios guardados.
        </p>
      ) : null}

      <div>
        <label className={label} htmlFor="title">
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={values.title}
          className={field}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="widthCm">
            Ancho (cm)
          </label>
          <input
            id="widthCm"
            name="widthCm"
            type="number"
            min={1}
            required
            defaultValue={values.widthCm}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="heightCm">
            Alto (cm)
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            min={1}
            required
            defaultValue={values.heightCm}
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="technique">
            Técnica
          </label>
          <input
            id="technique"
            name="technique"
            defaultValue={values.technique}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="year">
            Año
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            defaultValue={values.year ?? ""}
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="priceCents">
            Precio en euros
          </label>
          <input
            id="priceCents"
            name="priceCents"
            inputMode="decimal"
            placeholder="Vacío = a consultar"
            defaultValue={
              values.priceCents === null ? "" : values.priceCents / 100
            }
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="status">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={values.status}
            className={field}
          >
            {PAINTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={4000}
          defaultValue={values.description}
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="seriesId">
          Serie
        </label>
        <select
          id="seriesId"
          name="seriesId"
          defaultValue={values.seriesId ?? ""}
          className={field}
        >
          <option value="">Sin serie</option>
          {series.map((serie) => (
            <option key={serie.id} value={serie.id}>
              {serie.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            defaultChecked={values.published}
          />
          Visible en la galería
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={values.featured}
          />
          Destacada en portada
        </label>
      </div>

      <div>
        <Submit>{submitLabel}</Submit>
      </div>
    </form>
  );
}
