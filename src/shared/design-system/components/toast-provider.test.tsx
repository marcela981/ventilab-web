/*
* Funcionalidad: Global toast tests
* Descripción: Verifies the ToastProvider + useToast pair: success and info toasts are polite status messages that hide after 6 s, error toasts are alerts that stay until closed, only one toast is visible at a time and queued toasts follow in order, a new toast replaces a visible error instead of waiting behind it, the pending queue keeps only the latest 3 messages, a custom auto-hide duration, and useToast outside the provider throws. Depends on vitest, Testing Library and MUI.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "./toast-provider";
import { useToast } from "./use-toast";
import type { ToastApi } from "./use-toast";

let toast: ToastApi;

function Probe() {
  const api = useToast();

  // Published from a layout effect: render-time assignment is rejected by react-hooks/globals.
  useLayoutEffect(() => {
    toast = api;
  }, [api]);

  return null;
}

// The exit transition timer starts after the close re-render, so it needs its own advance.
function finishExitTransition() {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

function renderProvider() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ToastProvider", () => {
  it("shows a success toast as a status that hides after 6 seconds", () => {
    vi.useFakeTimers();
    renderProvider();

    act(() => toast.success("Grupo creado."));

    expect(screen.getByRole("status")).toHaveTextContent("Grupo creado.");

    act(() => {
      vi.advanceTimersByTime(5900);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    finishExitTransition();
    expect(screen.queryByText("Grupo creado.")).not.toBeInTheDocument();
  });

  it("shows info as a status and accepts a custom duration", () => {
    vi.useFakeTimers();
    renderProvider();

    act(() => toast.info("Sincronizando.", { autoHideMs: 1000 }));
    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando.");

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    finishExitTransition();
    expect(screen.queryByText("Sincronizando.")).not.toBeInTheDocument();
  });

  it("keeps an error alert until the user closes it", async() => {
    vi.useFakeTimers();
    renderProvider();

    act(() => toast.error("No se pudo guardar."));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");

    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: /close|cerrar/i }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("shows one toast at a time and the next one after the current closes", async() => {
    renderProvider();

    act(() => {
      toast.success("Primero", { autoHideMs: null });
      toast.info("Segundo");
    });

    expect(screen.getByRole("status")).toHaveTextContent("Primero");
    expect(screen.queryByText("Segundo")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close|cerrar/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Segundo"));
    expect(screen.queryByText("Primero")).not.toBeInTheDocument();
  });

  it("replaces a visible error with the newest toast instead of queueing behind it", async() => {
    renderProvider();

    act(() => toast.error("No se pudo guardar."));
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");

    act(() => toast.success("Integrante agregado."));

    expect(await screen.findByRole("status")).toHaveTextContent("Integrante agregado.");
    await waitFor(() => expect(screen.queryByText("No se pudo guardar.")).not.toBeInTheDocument());
  });

  it("replaces a visible error with a newer error, which keeps role alert", async() => {
    renderProvider();

    act(() => toast.error("Primer error"));
    act(() => toast.error("Segundo error"));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Segundo error"));
    expect(screen.queryByText("Primer error")).not.toBeInTheDocument();
  });

  it("keeps only the latest 3 pending toasts behind the visible one", async() => {
    renderProvider();

    act(() => {
      toast.success("Visible", { autoHideMs: null });
      toast.info("Uno", { autoHideMs: null });
      toast.info("Dos", { autoHideMs: null });
      toast.info("Tres", { autoHideMs: null });
      toast.info("Cuatro", { autoHideMs: null });
      toast.info("Cinco", { autoHideMs: null });
    });

    const shown: string[] = [];

    for (let step = 0; step < 4; step += 1) {
      const status = await screen.findByRole("status");

      shown.push(status.textContent ?? "");
      fireEvent.click(screen.getByRole("button", { name: /close|cerrar/i }));
      await waitFor(() => expect(screen.queryByText(shown[step] ?? "")).not.toBeInTheDocument());
    }

    expect(shown).toEqual(["Visible", "Tres", "Cuatro", "Cinco"]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fails fast when useToast is used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(/ToastProvider/);
  });
});
