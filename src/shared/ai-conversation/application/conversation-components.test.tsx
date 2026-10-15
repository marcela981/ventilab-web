/*
* Funcionalidad: AI conversation components tests
* Descripción: Tests of the presentational AI conversation pieces: MessageList wraps each turn in a labelled list item, MessageBubble shows user text as typed with its slots, StreamingMessage shows the typing indicator before the first text and announces only complete fragments while streaming (the rest once it stops) and with `announce={false}` drops its live region without remounting the footer, and SourceCitations renders nothing without sources and only safe http(s) links otherwise. Depends on vitest and Testing Library.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "./message-bubble";
import { MessageList } from "./message-list";
import { SourceCitations } from "./source-citations";
import { announcementFragments, StreamingMessage } from "./streaming-message";

describe("MessageList and MessageBubble", () => {
  it("lists each turn and shows user text as typed with its slots", () => {
    render(
      <MessageList label="Conversación">
        <MessageBubble key="u1" role="user" content={"**Hola**\nsegunda línea"} actions={<button type="button">Copiar</button>} />
        {null}
        <MessageBubble key="u2" role="user" content="Otra" footer={<p>Nota</p>} />
      </MessageList>,
    );

    const list = screen.getByRole("list", { name: "Conversación" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(/\*\*Hola\*\*/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
    expect(screen.getByText("Nota")).toBeInTheDocument();
  });
});

describe("StreamingMessage", () => {
  it("shows the typing indicator before the first text", () => {
    render(<StreamingMessage text="" isStreaming />);

    expect(screen.getByRole("status")).toHaveTextContent("Pensando…");
  });

  it("holds back an unfinished fragment while streaming and releases it when the stream stops", () => {
    expect(announcementFragments("La PEEP mantiene. Los alvéolos", true)).toEqual(["La PEEP mantiene."]);
    expect(announcementFragments("La PEEP mantiene. Los alvéolos", false)).toEqual(["La PEEP mantiene.", "Los alvéolos"]);
    expect(announcementFragments("Lista:\n- uno\n- dos", true)).toEqual(["Lista:", "- uno"]);
    expect(announcementFragments("Valor 5.5 cmH2O", true)).toEqual([]);
  });

  it("announces fragments through a polite live region", () => {
    const { container, rerender } = render(<StreamingMessage text="Primera frase. Seg" isStreaming />);
    const live = container.querySelector("[aria-relevant='additions']");

    expect(live).toHaveTextContent(/^Primera frase\.$/);
    rerender(<StreamingMessage text="Primera frase. Segunda frase" isStreaming={false} />);
    expect(live).toHaveTextContent("Primera frase. Segunda frase");
  });

  it("drops the live region when announce is false and keeps the footer mounted", () => {
    const { container, rerender } = render(<StreamingMessage text="Respuesta completa." isStreaming={false} footer={<input aria-label="Nota" defaultValue="" />} />);

    screen.getByRole("textbox", { name: "Nota" }).setAttribute("data-mounted", "first");
    rerender(<StreamingMessage text="Respuesta completa." isStreaming={false} announce={false} footer={<input aria-label="Nota" defaultValue="" />} />);

    expect(container.querySelector("[aria-relevant='additions']")).toBeNull();
    // Same DOM node: React kept the footer instead of remounting it.
    expect(screen.getByRole("textbox", { name: "Nota" })).toHaveAttribute("data-mounted", "first");
  });
});

describe("SourceCitations", () => {
  it("renders nothing without sources", () => {
    const { container } = render(<SourceCitations sources={[]} />);

    expect(container).toBeEmptyDOMElement();
    render(<SourceCitations />);
    expect(screen.queryByText("Fuentes")).not.toBeInTheDocument();
  });

  it("links only http(s) sources, in a new tab", () => {
    render(<SourceCitations sources={[{ title: "Guía", url: "https://example.org" }, { title: "Mala", url: "javascript:alert(1)" }]} />);

    expect(screen.getByRole("link", { name: "Guía" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Guía" })).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("link", { name: "Mala" })).not.toBeInTheDocument();
    expect(screen.getByText("Mala")).toBeInTheDocument();
  });
});
