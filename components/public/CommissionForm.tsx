"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatPrice } from "@/lib/catalog";
import { horquillaEncargo } from "@/lib/commissions";
import { sendCommission, type InquiryState } from "@/lib/public/actions";

const campo =
  "w-full rounded border border-[color:var(--color-canvas-dim)] bg-white px-3 py-2";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[color:var(--color-ink)] px-4 py-2 text-[color:var(--color-canvas)] disabled:opacity-50"
    >
      {pending ? "Enviando…" : "Enviar la petición"}
    </button>
  );
}

export function CommissionForm() {
  const [estado, formAction] = useActionState<InquiryState, FormData>(
    sendCommission,
    {},
  );
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState("");

  // La horquilla se actualiza según se escriben las medidas: filtra sin
  // ofender, porque quien no lo ve claro se va antes de escribir el encargo.
  const horquilla = horquillaEncargo(Number(ancho), Number(alto));

  if (estado.ok) {
    return (
      <p role="status" className="rounded bg-green-50 p-4 text-green-900">
        Petición enviada. La artista te escribirá con un presupuesto y con los
        plazos reales antes de empezar nada.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      {estado.error ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {estado.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm" htmlFor="name">
            Nombre
          </label>
          <input id="name" name="name" required className={campo} />
        </div>
        <div>
          <label className="block text-sm" htmlFor="email">
            Correo
          </label>
          <input id="email" name="email" type="email" required className={campo} />
        </div>
      </div>

      <div>
        <label className="block text-sm" htmlFor="brief">
          Qué te gustaría
        </label>
        <textarea
          id="brief"
          name="brief"
          rows={6}
          required
          minLength={20}
          placeholder="Un paisaje de la costa donde veraneaba de pequeña, con la luz de última hora."
          className={campo}
        />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm">Medidas que tienes en mente</legend>
        <div>
          <label className="block text-sm" htmlFor="widthCm">
            Ancho (cm)
          </label>
          <input
            id="widthCm"
            name="widthCm"
            type="number"
            min={1}
            max={400}
            value={ancho}
            onChange={(evento) => setAncho(evento.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className="block text-sm" htmlFor="heightCm">
            Alto (cm)
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            min={1}
            max={400}
            value={alto}
            onChange={(evento) => setAlto(evento.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className="block text-sm" htmlFor="deadline">
            Para cuándo
          </label>
          <input
            id="deadline"
            name="deadline"
            placeholder="Sin prisa"
            className={campo}
          />
        </div>
      </fieldset>

      {horquilla ? (
        <p
          role="status"
          className="rounded bg-[color:var(--color-canvas-dim)]/50 p-3 text-sm"
        >
          Un encargo de ese tamaño suele estar entre{" "}
          <strong>{formatPrice(horquilla.desdeCentimos)}</strong> y{" "}
          <strong>{formatPrice(horquilla.hastaCentimos)}</strong>. Es una
          horquilla orientativa: el precio se cierra por correo, según lo que
          pidas.
        </p>
      ) : ancho && alto ? (
        <p className="rounded bg-[color:var(--color-canvas-dim)]/50 p-3 text-sm">
          A ese tamaño el precio depende mucho del encargo. Cuéntame qué tienes
          en mente y te digo.
        </p>
      ) : null}

      {/* Trampa para bots: invisible y fuera del orden de tabulación. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px"
      />

      <div>
        <Enviar />
      </div>
    </form>
  );
}
