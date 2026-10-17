/*
* Funcionalidad: Focus mode tests
* Descripción: Verifies useFocusMode with the ToastProvider: a notice toast is dropped while focus is active and shows again once every claim is released (reference-counted nested claims, `active` false claims nothing), and a non-notice toast still shows while focus is active. Depends on vitest, Testing Library and MUI.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "./toast-provider";
import { useFocusMode } from "./use-focus-mode";
import { useToast } from "./use-toast";
import type { ToastApi } from "./use-toast";

let toast: ToastApi;

function Probe() {
  const api = useToast();

  useLayoutEffect(() => {
    toast = api;
  }, [api]);

  return null;
}

function Focus({ active }: { active?: boolean }) {
  useFocusMode(active);

  return null;
}

type Claims = { first: boolean, second: boolean, inactive: boolean };

function renderWithFocus({ first, second, inactive }: Claims) {
  return render(
    <ToastProvider>
      <Probe />
      {first ? <Focus /> : null}
      {second ? <Focus active /> : null}
      {inactive ? <Focus active={false} /> : null}
    </ToastProvider>,
  );
}

describe("useFocusMode", () => {
  it("drops notice toasts while focus is active and shows them after every claim is released", () => {
    const view = renderWithFocus({ first: true, second: true, inactive: false });

    act(() => toast.info("Nueva notificación", { notice: true }));
    expect(screen.queryByText("Nueva notificación")).not.toBeInTheDocument();

    // One of two nested claims released: still in focus.
    view.rerender(
      <ToastProvider>
        <Probe />
        <Focus />
      </ToastProvider>,
    );
    act(() => toast.info("Segunda notificación", { notice: true }));
    expect(screen.queryByText("Segunda notificación")).not.toBeInTheDocument();

    view.rerender(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    act(() => toast.info("Tercera notificación", { notice: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Tercera notificación");
  });

  it("keeps showing user-action toasts while focus is active", () => {
    renderWithFocus({ first: true, second: false, inactive: false });

    act(() => toast.error("No se pudo guardar la respuesta."));
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar la respuesta.");
  });

  it("claims nothing when called with false", () => {
    renderWithFocus({ first: false, second: false, inactive: true });

    act(() => toast.info("Aviso", { notice: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Aviso");
  });

  it("does nothing outside a ToastProvider", () => {
    expect(() => render(<Focus />)).not.toThrow();
  });
});
