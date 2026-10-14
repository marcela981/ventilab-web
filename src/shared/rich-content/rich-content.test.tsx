/*
* Funcionalidad: RichContent tests
* Descripción: Covers the pure format detection and the lazily loaded markdown/math rendering of RichContent (real react-markdown, remark-gfm, remark-math and rehype-katex run under jsdom), the raw-HTML policy and unsafe link removal. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { detectContentFormat } from "./content-format";
import { RichContent } from "./rich-content";

// The first lazy import transforms react-markdown/KaTeX on demand, which is slow on a loaded machine.
const LAZY_WAIT = { timeout: 10_000 };

describe("detectContentFormat", () => {
  it("classifies empty, plain markdown and markdown with math", () => {
    expect(detectContentFormat("")).toBe("empty");
    expect(detectContentFormat("   \n ")).toBe("empty");
    expect(detectContentFormat(null)).toBe("empty");
    expect(detectContentFormat(42)).toBe("empty");
    expect(detectContentFormat("# PEEP\n\nTexto")).toBe("markdown");
    expect(detectContentFormat("La compliance es $C = \\frac{\\Delta V}{\\Delta P}$")).toBe("markdown-math");
    expect(detectContentFormat("$$\nV_T = 6\\,ml/kg\n$$")).toBe("markdown-math");
  });
});

describe("RichContent", () => {
  it("shows an empty message without loading any renderer", () => {
    render(<RichContent content="  " />);

    expect(screen.getByText("No hay contenido para mostrar.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders markdown after the lazy renderer loads, with a loading fallback first", async() => {
    render(<RichContent content={"## Parámetros\n\n- **PEEP**: presión\n\n| A | B |\n|---|---|\n| 1 | 2 |"} />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando contenido…");
    expect(await screen.findByRole("heading", { level: 2, name: "Parámetros" }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByText("PEEP").tagName).toBe("STRONG");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders math with KaTeX when the content has $ delimiters", async() => {
    const { container } = render(<RichContent content={"Compliance: $C = \\frac{V}{P}$"} />);

    await screen.findByText(/Compliance:/, {}, LAZY_WAIT);

    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("never injects raw HTML and drops unsafe link protocols", async() => {
    const { container } = render(
      <RichContent content={"Texto <script>alert(1)</script> <b>negrita</b>\n\n[malo](javascript:alert(1)) [bueno](https://example.org)"} />,
    );

    await screen.findByText(/Texto/, {}, LAZY_WAIT);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("malo").getAttribute("href") ?? "").not.toMatch(/javascript/i);

    const external = screen.getByRole("link", { name: "bueno" });

    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
  });
});
