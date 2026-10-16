/*
* Funcionalidad: CopyMessageButton tests
* Descripción: Behaviour of the "Copiar" action of an assistant answer: a successful clipboard write confirms with "Copiado", and a clipboard write that resolves after the button unmounted neither updates its state nor schedules the feedback timer (A3, review R3-copy-timer-after-unmount). Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyMessageButton } from "./copy-message-button";

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("CopyMessageButton", () => {
  it("copies the answer and confirms it", async() => {
    const writeText = vi.fn(() => Promise.resolve());

    stubClipboard(writeText);
    render(<CopyMessageButton text="La PEEP es…" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("La PEEP es…");
  });

  it("does not update or schedule the feedback timer when the copy resolves after unmount", async() => {
    let resolveWrite: () => void = () => undefined;

    stubClipboard(() => new Promise<void>((resolve) => {
      resolveWrite = resolve;
    }));

    const { unmount } = render(<CopyMessageButton text="Respuesta" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    unmount();

    const timers = vi.spyOn(globalThis, "setTimeout");
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await act(async() => {
      resolveWrite();
      await Promise.resolve();
    });

    expect(timers.mock.calls.filter(([, delay]) => delay === 2000)).toHaveLength(0);
    expect(errors).not.toHaveBeenCalled();
  });
});
