/*
* Funcionalidad: Composer tests
* Descripción: Tests of the AI conversation composer: Enter sends the trimmed message, Shift+Enter inserts a new line, empty or disabled input does not send, the character counter appears only near the limit, `submitOnEnter={false}` keeps Enter as a new line (only the button sends), `showCounter={false}` hides the counter, the Stop button shows while streaming, and the ref focuses the textarea. Depends on vitest and Testing Library.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./composer";
import type { ComposerProps } from "./composer";

type HarnessProps = Partial<Omit<ComposerProps, "value" | "onValueChange">> & { initial?: string };

function Harness({ initial = "", onSubmit = vi.fn(), ...props }: HarnessProps) {
  const [value, setValue] = useState(initial);

  return <Composer label="Tu pregunta" maxLength={100} {...props} value={value} onValueChange={setValue} onSubmit={onSubmit} />;
}

const textbox = () => screen.getByRole("textbox", { name: "Tu pregunta" });

describe("Composer", () => {
  it("sends the trimmed message with Enter", () => {
    const onSubmit = vi.fn();

    render(<Harness initial="  ¿Qué es la PEEP?  " onSubmit={onSubmit} />);
    fireEvent.keyDown(textbox(), { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("¿Qué es la PEEP?");
  });

  it("does not send with Shift+Enter, so the textarea gets a new line", () => {
    const onSubmit = vi.fn();

    render(<Harness initial="Hola" onSubmit={onSubmit} />);
    const event = fireEvent.keyDown(textbox(), { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
    // The default action (inserting the line break) is not prevented.
    expect(event).toBe(true);
  });

  it("does not send an empty message or while disabled", () => {
    const onSubmit = vi.fn();
    const { unmount } = render(<Harness initial="   " onSubmit={onSubmit} />);

    fireEvent.keyDown(textbox(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    unmount();

    render(<Harness initial="Hola" onSubmit={onSubmit} disabled />);
    fireEvent.keyDown(textbox(), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends with the Enviar button", () => {
    const onSubmit = vi.fn();

    render(<Harness initial="Hola" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSubmit).toHaveBeenCalledWith("Hola");
  });

  it("shows the character counter only near the limit", () => {
    render(<Harness initial={"a".repeat(89)} />);
    expect(screen.queryByText(/\/ 100/)).not.toBeInTheDocument();

    fireEvent.change(textbox(), { target: { value: "a".repeat(90) } });
    expect(screen.getByText("90 / 100")).toBeInTheDocument();
    expect(textbox()).toHaveAttribute("maxLength", "100");
  });

  it("keeps Enter as a new line when submitOnEnter is false, so only the Enviar button sends", () => {
    const onSubmit = vi.fn();

    render(<Harness initial="Hola" submitOnEnter={false} onSubmit={onSubmit} />);
    // fireEvent returns false only when the default action (the new line) was prevented.
    expect(fireEvent.keyDown(textbox(), { key: "Enter" })).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalledWith("Hola");
  });

  it("never shows the character counter when showCounter is false", () => {
    render(<Harness initial={"a".repeat(95)} showCounter={false} />);

    expect(screen.queryByText(/\/ 100/)).not.toBeInTheDocument();
    expect(textbox()).not.toHaveAttribute("aria-describedby");
    expect(textbox()).toHaveAttribute("maxLength", "100");
  });

  it("shows Detener while streaming and blocks sending", () => {
    const onStop = vi.fn();
    const onSubmit = vi.fn();

    render(<Harness initial="Hola" isStreaming onStop={onStop} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.keyDown(textbox(), { key: "Enter" });

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the textarea through its ref for focus", () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(<Harness ref={ref} />);
    ref.current?.focus();

    expect(textbox()).toHaveFocus();
  });
});
