// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatCard } from "./StatCard";

// `next/link` necesita el router de la app para montarse. En una prueba de
// unidad no hay navegación que probar: basta con el <a> que acaba en el DOM.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("StatCard", () => {
  it("muestra la etiqueta y la cifra", () => {
    render(<StatCard label="Obras en catálogo" value={42} />);

    expect(screen.getByText("Obras en catálogo")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("sin href no es un enlace", () => {
    render(<StatCard label="Vendidas" value={3} />);

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("con href la tarjeta entera enlaza, cifra incluida", () => {
    render(
      <StatCard label="Vendidas" value={3} href="/admin/obras?estado=SOLD" />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/obras?estado=SOLD");
    expect(link).toHaveTextContent("Vendidas");
    expect(link).toHaveTextContent("3");
  });

  it("la pista solo aparece si se le da una", () => {
    const { rerender } = render(<StatCard label="Disponibles" value={0} />);
    expect(screen.queryByText("sin precio asignado")).toBeNull();

    rerender(
      <StatCard label="Disponibles" value={0} hint="sin precio asignado" />,
    );
    expect(screen.getByText("sin precio asignado")).toBeInTheDocument();
  });

  it("el tono de aviso tiñe la cifra, no la etiqueta", () => {
    render(<StatCard label="Consultas sin leer" value={7} tone="accent" />);

    expect(screen.getByText("7").className).toContain("--color-oil");
  });
});
