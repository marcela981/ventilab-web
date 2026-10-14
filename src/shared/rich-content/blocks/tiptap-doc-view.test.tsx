/*
* Funcionalidad: Tiptap document renderer tests
* Descripción: Tests of the pure Tiptap JSON renderer: paragraphs and headings, every supported mark, safe link protocols only, bullet/ordered/task lists, blockquote, code block, hard break, horizontal rule, unknown nodes rendering their children and invalid input rendering nothing. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TiptapDocView } from "./tiptap-doc-view";

const text = (value: string, marks?: unknown[]) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("TiptapDocView", () => {
  it("renders paragraphs and headings with their level", () => {
    render(<TiptapDocView doc={doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Parámetros")] },
      { type: "heading", attrs: { level: 9 }, content: [text("Nivel fuera de rango")] },
      paragraph(text("La PEEP mantiene los alvéolos abiertos.")),
    )} />);

    expect(screen.getByRole("heading", { level: 2, name: "Parámetros" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: "Nivel fuera de rango" })).toBeInTheDocument();
    expect(screen.getByText("La PEEP mantiene los alvéolos abiertos.").tagName).toBe("P");
  });

  it("applies bold, italic, underline, strike, code and highlight marks and ignores textStyle", () => {
    render(<TiptapDocView doc={doc(paragraph(
      text("negrita", [{ type: "bold" }]),
      text("cursiva", [{ type: "italic" }]),
      text("subrayado", [{ type: "underline" }]),
      text("tachado", [{ type: "strike" }]),
      text("Vt", [{ type: "code" }]),
      text("resaltado", [{ type: "highlight" }]),
      text("color", [{ type: "textStyle", attrs: { color: "red" } }]),
      text("anidado", [{ type: "bold" }, { type: "italic" }]),
    ))} />);

    expect(screen.getByText("negrita").tagName).toBe("STRONG");
    expect(screen.getByText("cursiva").tagName).toBe("EM");
    expect(screen.getByText("subrayado").tagName).toBe("U");
    expect(screen.getByText("tachado").tagName).toBe("S");
    expect(screen.getByText("Vt").tagName).toBe("CODE");
    expect(screen.getByText("resaltado").tagName).toBe("MARK");
    expect(screen.getByText("color").tagName).toBe("P");
    expect(screen.getByText("color")).not.toHaveAttribute("style");

    const nested = screen.getByText("anidado");

    expect(nested.tagName).toBe("EM");
    expect(nested.parentElement?.tagName).toBe("STRONG");
  });

  it("renders only http, https, mailto and same-site links as anchors", () => {
    const link = (href: string) => [{ type: "link", attrs: { href } }];

    render(<TiptapDocView doc={doc(paragraph(
      text("externo", link("https://example.org")),
      text("correo", link("mailto:docente@example.org")),
      text("interno", link("/learn")),
      text("malicioso", link("javascript:alert(1)")),
      text("datos", link("data:text/html,hola")),
      text("protocolo", link("//evil.com")),
    ))} />);

    const external = screen.getByRole("link", { name: "externo" });

    expect(external).toHaveAttribute("href", "https://example.org");
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "correo" })).toHaveAttribute("href", "mailto:docente@example.org");
    expect(screen.getByRole("link", { name: "interno" })).not.toHaveAttribute("target");

    for (const name of ["malicioso", "datos", "protocolo"]) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
      expect(screen.getByText(new RegExp(name))).toBeInTheDocument();
    }
  });

  it("renders bullet, ordered and task lists", () => {
    const item = (value: string) => ({ type: "listItem", content: [paragraph(text(value))] });

    render(<TiptapDocView doc={doc(
      { type: "bulletList", content: [item("PEEP"), item("FiO2")] },
      { type: "orderedList", attrs: { start: 3 }, content: [item("Paso tres")] },
      {
        type: "taskList",
        content: [
          { type: "taskItem", attrs: { checked: true }, content: [paragraph(text("Revisado"))] },
          { type: "taskItem", attrs: { checked: false }, content: [paragraph(text("Pendiente"))] },
        ],
      },
    )} />);

    const lists = screen.getAllByRole("list");

    expect(lists).toHaveLength(3);
    expect(lists[0]?.tagName).toBe("UL");
    expect(lists[1]?.tagName).toBe("OL");
    expect(lists[1]).toHaveAttribute("start", "3");

    const boxes = screen.getAllByRole("checkbox");

    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    expect(boxes[0]).toBeDisabled();
  });

  it("renders blockquote, code block, hard break and horizontal rule", () => {
    const { container } = render(<TiptapDocView doc={doc(
      { type: "blockquote", content: [paragraph(text("Cita"))] },
      { type: "codeBlock", attrs: { language: "js" }, content: [text("const vt = 6;")] },
      paragraph(text("Línea 1"), { type: "hardBreak" }, text("Línea 2")),
      { type: "horizontalRule" },
    )} />);

    expect(container.querySelector("blockquote")).toHaveTextContent("Cita");
    expect(container.querySelector("pre code")).toHaveTextContent("const vt = 6;");
    expect(container.querySelector("br")).not.toBeNull();
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("renders the children of unknown nodes and nothing for invalid input", () => {
    const { container, rerender } = render(<TiptapDocView doc={doc(
      { type: "mysteryWrapper", content: [paragraph(text("Contenido interno"))] },
      { type: "image", attrs: { src: "https://example.org/x.png" } },
    )} />);

    expect(screen.getByText("Contenido interno")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();

    rerender(<TiptapDocView doc={{ type: "paragraph" }} />);

    expect(container).toBeEmptyDOMElement();

    rerender(<TiptapDocView doc="<script>alert(1)</script>" />);

    expect(container).toBeEmptyDOMElement();
  });
});
