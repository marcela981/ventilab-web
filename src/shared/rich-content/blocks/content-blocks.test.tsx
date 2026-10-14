/*
* Funcionalidad: Content blocks renderer tests
* Descripción: Tests of ContentBlocks per block type: Tiptap doc, markdown, sanitized HTML, callout variant, QUIZ as rich text, IMAGE/FILE from mediaUrl (unsafe URLs dropped), VIDEO as privacy-friendly YouTube/Vimeo embed or native video and as a visible link in print mode, lazy KaTeX EQUATION, CODE, DIVIDER and unknown types; plus the video URL parser. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentBlocks } from "./content-blocks";
import type { ContentBlockInput } from "./content-block.types";
import { parseVideoEmbed } from "./video-source";

// The first lazy import transforms react-markdown/KaTeX/DOMPurify on demand, which is slow on a loaded machine.
const LAZY_WAIT = { timeout: 10_000 };
const LAZY_TEST_TIMEOUT = 20_000;

const block = (type: string, content: unknown, extra: Partial<ContentBlockInput> = {}): ContentBlockInput => ({
  id: `${type}-1`,
  type,
  content,
  ...extra,
});

const tiptapDoc = (value: string) => ({
  doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] },
});

describe("parseVideoEmbed", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871?dnt=1"],
    ["https://player.vimeo.com/video/76979871", "https://player.vimeo.com/video/76979871?dnt=1"],
  ])("builds the embed URL for %s", (url, embedUrl) => {
    expect(parseVideoEmbed(url)?.embedUrl).toBe(embedUrl);
  });

  it.each([
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=bad\"id",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "https://vimeo.com/channels/staff",
    "javascript:alert(1)",
    "",
  ])("rejects %j", (url) => {
    expect(parseVideoEmbed(url)).toBeNull();
  });
});

describe("ContentBlocks", () => {
  it("renders rich text blocks from a Tiptap doc with the block title, without loading a lazy chunk", () => {
    render(<ContentBlocks blocks={[block("THEORY", tiptapDoc("La PEEP evita el colapso."), { title: "Teoría" })]} />);

    expect(screen.getByRole("heading", { level: 2, name: "Teoría" })).toBeInTheDocument();
    expect(screen.getByText("La PEEP evita el colapso.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders QUIZ blocks as rich text", () => {
    render(<ContentBlocks blocks={[block("QUIZ", tiptapDoc("¿Qué es la compliance?"))]} />);

    expect(screen.getByText("¿Qué es la compliance?")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("renders markdown content through RichContent", async() => {
    render(<ContentBlocks blocks={[block("TEXT", { markdown: "## Volumen tidal\n\n**6 ml/kg**" })]} />);

    expect(await screen.findByRole("heading", { level: 2, name: "Volumen tidal" }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByText("6 ml/kg").tagName).toBe("STRONG");
  }, LAZY_TEST_TIMEOUT);

  it("sanitizes HTML content before rendering it", async() => {
    const { container } = render(<ContentBlocks blocks={[
      block("SUMMARY", { html: "<p>Resumen <b>clave</b><img src=x onerror=\"alert(1)\"></p><script>alert(1)</script>" }),
    ]} />);

    expect(await screen.findByText("clave", {}, LAZY_WAIT)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  }, LAZY_TEST_TIMEOUT);

  it("renders a callout as a note with its variant", () => {
    render(<ContentBlocks blocks={[block("CALLOUT", { ...tiptapDoc("Precaución con la presión meseta."), variant: "warning" })]} />);

    const note = screen.getByRole("note");

    expect(note).toHaveTextContent("Precaución con la presión meseta.");
    expect(note).toHaveAttribute("data-variant", "warning");
    expect(note.className).toMatch(/warning/i);
  });

  it("renders images and files from mediaUrl and drops unsafe URLs", () => {
    render(<ContentBlocks blocks={[
      block("IMAGE", { alt: "Curva presión-volumen", caption: "Figura 1" }, { mediaId: "m1", mediaUrl: "https://cdn.example.org/pv.png" }),
      block("FILE", { caption: "Guía de práctica" }, { id: "file-1", mediaId: "m2", mediaUrl: "https://cdn.example.org/guia.pdf" }),
      block("IMAGE", {}, { id: "image-2", mediaId: "m3", mediaUrl: "javascript:alert(1)" }),
    ]} />);

    const image = screen.getByRole("img", { name: "Curva presión-volumen" });

    expect(image).toHaveAttribute("src", "https://cdn.example.org/pv.png");
    expect(screen.getByText("Figura 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Guía de práctica/ })).toHaveAttribute("href", "https://cdn.example.org/guia.pdf");
    expect(screen.getByText("Imagen no disponible.")).toBeInTheDocument();
  });

  it("embeds YouTube videos with the privacy-friendly domain and uploads with a native player", () => {
    const { container } = render(<ContentBlocks blocks={[
      block("VIDEO", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, { title: "Ciclo respiratorio" }),
      block("VIDEO", { caption: "Maniobra" }, { id: "video-2", mediaId: "m4", mediaUrl: "https://cdn.example.org/maniobra.mp4" }),
    ]} />);

    const frame = container.querySelector("iframe");

    expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(frame).toHaveAttribute("title", "Ciclo respiratorio");
    expect(container.querySelector("video")).toHaveAttribute("src", "https://cdn.example.org/maniobra.mp4");
  });

  it("renders videos as visible links in print mode", () => {
    const { container } = render(<ContentBlocks mode="print" blocks={[
      block("VIDEO", { url: "https://vimeo.com/76979871" }),
      block("VIDEO", {}, { id: "video-2", mediaId: "m4", mediaUrl: "https://cdn.example.org/maniobra.mp4" }),
    ]} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("link", { name: "https://vimeo.com/76979871" })).toHaveAttribute("href", "https://vimeo.com/76979871");
    expect(screen.getByRole("link", { name: "https://cdn.example.org/maniobra.mp4" })).toBeInTheDocument();
  });

  it("falls back to a link for a video URL that cannot be embedded", () => {
    const { container } = render(<ContentBlocks blocks={[block("VIDEO", { url: "https://vimeo.com/channels/staff" })]} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: "https://vimeo.com/channels/staff" })).toBeInTheDocument();
  });

  it("renders equations with KaTeX loaded lazily, showing the LaTeX source first", async() => {
    const { container } = render(<ContentBlocks blocks={[block("EQUATION", { latex: "C = \\frac{V}{P}", display: true })]} />);

    expect(screen.getByText("C = \\frac{V}{P}")).toBeInTheDocument();

    await expect.poll(() => container.querySelector(".katex-display"), LAZY_WAIT).not.toBeNull();
  }, LAZY_TEST_TIMEOUT);

  it("renders code, divider and ignores unknown block types", () => {
    const { container } = render(<ContentBlocks blocks={[
      block("CODE", { code: "peep = 5", language: "python" }),
      block("DIVIDER", {}),
      block("HOLOGRAM", { anything: true }),
      block("IMAGE", "not an object"),
    ]} />);

    expect(container.querySelector("pre code")).toHaveTextContent("peep = 5");
    expect(container.querySelector("hr")).not.toBeNull();
    expect(container.querySelectorAll("[data-block-type]")).toHaveLength(3);
  });
});
