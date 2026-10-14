/*
* Funcionalidad: FormField, AsyncButton and skeleton tests
* Descripción: Verifies FormField (visible label, required marker, id-linked helper and error text, aria-invalid from an entity validator string), AsyncButton (spinner and aria-busy while `loading` or while the Promise returned by onClick is pending, disabled meanwhile, accessible name preserved) and the list/card skeleton presets (hidden from assistive technology inside a busy status region). Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AsyncButton } from "./async-button";
import { FormField } from "./form-field";
import { CardSkeleton, ListSkeleton } from "./skeleton";

describe("FormField", () => {
  it("shows a labelled field with the helper text linked to it", () => {
    render(<FormField id="name" label="Nombre" value="" onChange={() => {}} helperText="Tu nombre completo" required />);

    const input = screen.getByRole("textbox", { name: /Nombre/ });

    expect(input).toHaveAttribute("id", "name");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAccessibleDescription("Tu nombre completo");
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows the validator message instead of the helper and marks the field invalid", () => {
    render(<FormField label="Correo" value="x" onChange={() => {}} helperText="Ayuda" error="Ingresa un correo válido." />);

    const input = screen.getByRole("textbox", { name: "Correo" });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Ingresa un correo válido.");
    expect(screen.queryByText("Ayuda")).not.toBeInTheDocument();
  });

  it("treats an undefined validator result as valid and generates an id", () => {
    render(<FormField label="Semestre" value="" onChange={() => {}} error={undefined} />);

    const input = screen.getByRole("textbox", { name: "Semestre" });

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.id).not.toBe("");
  });
});

describe("AsyncButton", () => {
  it("is busy and disabled while loading, keeping its accessible name", () => {
    const { rerender } = render(<AsyncButton loading={false}>Guardar</AsyncButton>);
    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    rerender(<AsyncButton loading>Guardar</AsyncButton>);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("stays busy until the promise returned by onClick settles", async() => {
    let finish: () => void = () => {};
    const onClick = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));

    render(<AsyncButton onClick={onClick}>Agregar</AsyncButton>);
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agregar" })).toHaveAttribute("aria-busy", "true");

    await act(async() => {
      finish();
    });

    expect(screen.getByRole("button", { name: "Agregar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Agregar" })).toHaveAttribute("aria-busy", "false");
  });

  it("does not become busy for a synchronous onClick and respects disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<AsyncButton onClick={onClick}>Cerrar</AsyncButton>);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-busy", "false");

    rerender(<AsyncButton onClick={onClick} disabled>Cerrar</AsyncButton>);
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
  });
});

describe("skeletons", () => {
  it("renders a list skeleton with the requested rows inside a busy status region", () => {
    const { container } = render(<ListSkeleton rows={4} label="Cargando grupos…" />);
    const region = screen.getByRole("status", { name: "Cargando grupos…" });

    expect(region).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(4);
  });

  it("renders a card skeleton with a default label", () => {
    render(<CardSkeleton />);

    expect(screen.getByRole("status", { name: "Cargando…" })).toHaveAttribute("aria-busy", "true");
  });
});
