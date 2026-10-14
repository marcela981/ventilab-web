/*
* Funcionalidad: NoteEditor tests
* Descripción: Smoke test of the real Tiptap note editor in jsdom: it mounts the editable area with its accessible label and the saved document. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteEditor } from "./note-editor";

describe("NoteEditor", () => {
  it("mounts an editable area with the saved document", async() => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "PEEP alta" }] }] };

    render(<NoteEditor initialContent={doc} label="Contenido de la nota" placeholder="Escribe" onChange={vi.fn()} onBlur={vi.fn()} />);

    const editor = await screen.findByRole("textbox", { name: "Contenido de la nota" });

    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(editor).toHaveTextContent("PEEP alta");
  });
});
